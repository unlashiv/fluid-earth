#pragma glslify: export(equalEarth)
#pragma glslify: rotate = require(./rotate.glsl)

const float A1 = 1.340264;
const float A2 = -0.081106;
const float A3 = 0.000893;
const float A4 = 0.003796;
const float M = sqrt(3.0) / 2.0;
const int iterations = 12;

void equalEarth(in vec2 coord, in vec2 lonLat0, out vec2 lonLat) {
  float l = coord.y;
  float l2 = l * l;
  float l6 = l2 * l2 * l2;

  float delta, fy, fpy;
  for (int i = 0; i < iterations; i++) {
    fy = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)) - coord.y;
    fpy = A1 + 3.0 * A2 * l2 + l6 * (7.0 * A3 + 9.0 * A4 * l2);
    delta = fy / fpy;
    l -= delta;
    l2 = l * l;
    l6 = l2 * l2 * l2;
  }

  lonLat.x = M * coord.x *
    (A1 + 3.0 * A2 * l2 + l6 * (7.0 * A3 + 9.0 * A4 * l2)) / cos(l);
  lonLat.y = asin(sin(l) / M);

  rotate(lonLat0, lonLat);
}
