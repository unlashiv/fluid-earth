import { Datetime } from '../datetime.js';
import { download, get_json, post_json } from '../download.js'
import { grib1 } from '../file-conversions.js';
import { typical_metadata, output_path, run_all } from '../utility.js';
import { rm } from 'fs/promises';
import { setTimeout as sleep } from 'timers/promises';
import { parentPort } from 'worker_threads'
import 'dotenv/config'

const name = 'reanalysis-era5-single-levels-monthly-means';

const shared_metadata = {
  width: 1440,
  height: 721,
  interval: 'monthly-aggregate',
  projection: 'ERA5',
};

export async function forage(current_state, datasets) {
  let { date, last_updated } = current_state;
  let dt = date
    ? Datetime.from(date).add({ months: 1 })
    : Datetime.from('1959-01-01');
  date = dt.to_iso_string();
  last_updated = await verify_update_needed(name, dt, last_updated);

  let metadatas = datasets.map(d => typical_metadata(d, dt, shared_metadata));
  let variables = [...new Set(datasets.map(d => d.variable))];

  let input;
  try {
    input = await download_cds(name, {
      format: 'grib',
      product_type: 'monthly_averaged_reanalysis',
      year: dt.year,
      month: dt.p_month,
      time: '00:00',
      variable: variables,
    }, process.env.CDS_API_KEY);
  } catch(e) {
    if (e === 'Error: no data is available within your requested subset') {
      return { new_state: { ...current_state, last_updated } };
    }
    throw e;
  }

  await run_all(datasets.map((dataset, i) => async () => {
    let output = output_path(dataset.output_dir, dt.to_iso_string());
    let record_number = variables.findIndex(dataset.variable) + 1;
    await grib1(input, output, { record_number });
  }));
  await rm(input);

  return { metadatas, new_state: { date, last_updated } };
}

const base_url = 'https://cds.climate.copernicus.eu/api/v2';

async function verify_update_needed(name, dt, last_updated) {
  let ui_resources_url = `${base_url}.ui/resources/${name}`;
  let { update_date } = await get_json(ui_resources_url);
  let getting_latest = dt >= Datetime.from(update_date).round({
    smallestUnit: 'month',
    roundingMode: 'floor',
  });
  if (last_updated === update_date && getting_latest) throw 'No update needed';
  return update_date;
}

async function download_cds(name, request, auth) {
  let resource_url = `${base_url}/resources/${name}`

  let response = await post_json(resource_url, request, { auth });
  let task_url = `${base_url}/tasks/${response.request_id}`;

  let sleep_time = 1e3;
  let reply = await get_json(task_url, { auth });

  while(['queued', 'running'].includes(reply.state)) {
    await sleep(sleep_time);
    sleep_time = Math.min(sleep_time * 1.5, 120e3);
    reply = await get_json(task_url, { auth });
    parentPort?.postMessage('keepalive');
  }

  if (reply.state !== 'completed') throw `Error: ${reply.error.message}`;

  let download_url = reply.location.startsWith('https://')
    ? reply.location
    : `${base_url}/${reply.location}`;

  return download(download_url, { auth });
}
