import { Datetime } from '../datetime.js';
import { download } from '../download.js';
import { output_path } from '../utility.js';

const reference_datetime = Datetime.from('1992-10-05');

const shared_metadata = {
  width: 1201,
  height: 481,
  intervalInHours: 'custom:OSCAR',
  projection: 'OSCAR',
};

export async function forage(current_state, datasets) {
  let { start, end } = current_state;
  let dt;
  if (end) {
    dt = Datetime.next_oscar_date(end);
  } else {
    dt = reference_datetime.add({ days: 7001 });
    start = dt.to_iso_string();
  }
  end = dt.to_iso_string();

  let input = await download(
    'https://podaac-opendap.jpl.nasa.gov/'
    + 'opendap/allData/oscar/preview/L4/oscar_third_deg/'
    + `oscar_vel${dt.days_since(reference_datetime)}.nc.gz.nc4`
  );

  let metadatas = await Promise.all(datasets.map(async dataset => {
    let output = output_path(dataset.output_dir, end);
    await dataset.convert(input, output, { variables: 'u,v' });

    return { start, end, ...dataset.unique_metadata, ...shared_metadata };
  }));

  return { metadatas, new_state: { start, end } };
}
