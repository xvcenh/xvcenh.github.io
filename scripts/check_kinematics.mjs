import assert from "node:assert/strict";
import {forward, inverse, lengths} from "../assets/js/kinematics.mjs";

const tolerance = 1e-5;
function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < tolerance, label + ": " + actual + " vs " + expected);
}
function distance(p, q) {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

let count = 0;
for (let left = -150; left <= 150; left += 10) {
  for (let right = -150; right <= 150; right += 10) {
    const pose = forward(left, right);
    assert.ok(pose.valid);
    near(distance(pose.B, pose.C), lengths.shin, "left shin length");
    near(distance(pose.D, pose.C), lengths.shin, "right shin length");
    const recovered = inverse(right, pose.knee, left);
    assert.ok(recovered.valid);
    near(recovered.hip1, left, "recovered hip angle");
    near(distance(recovered.C, pose.C), 0, "recovered end point");
    count++;
  }
}
assert.equal(inverse(0, 0).valid, false, "unreachable target");
console.log("Verified " + count + " five-bar round trips and an unreachable target.");
