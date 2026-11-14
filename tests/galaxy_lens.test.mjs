import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stableHash, spiralLayout, matchesBand} from "../assets/janus-galaxy.mjs";

test("stable ID hashing and galaxy projection are deterministic", () => {
  const records = [{id:"json:A"},{id:"json:B"},{id:"json:C"}];
  assert.deepEqual(spiralLayout(records),spiralLayout(records));
  assert.notEqual(stableHash("json:A"),stableHash("json:B"));
  assert.equal(spiralLayout(records).length, 3);
  for (const p of spiralLayout(records)) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.item.id.startsWith("json:"));
  }
});
test("repository filters use only metadata actually supplied by records", () => {
  const one = {path:".janus/CONTRACT.json",sourceCommit:"abc",sourceUrl:"https://github.com/Hawkar-usls/Hrain/blob/abc/a.json",sizeBytes:20000};
  const two = {path:"other.json",sourceCommit:null,sourceUrl:null,sizeBytes:3};
  for (const band of ["all","source","contract","signal"]) assert.equal(matchesBand(one,band),true);
  for (const band of ["source","contract","signal"]) assert.equal(matchesBand(two,band),false);
});
test("associative attention is not evidence, and requires explicit source records", () => {
  const without = {depth:1,attention_score:99,meaning:{evidence:{source_records:[]}}};
  const withSource = {depth:2,attention_score:10,meaning:{evidence:{source_records:[{id:"obj:1"}]}}};
  assert.equal(matchesBand(without,"source","semantic"),false);
  assert.equal(matchesBand(without,"signal","semantic"),true);
  assert.equal(matchesBand(withSource,"source","semantic"),true);
  assert.equal(matchesBand(withSource,"contract","semantic"),true);
  assert.equal(matchesBand(without,"contract","semantic"),false);
});
test("read-only browser contract: no browser persistence, mutation, or external script", () => {
  const script=readFileSync(new URL("../assets/janus-galaxy.mjs",import.meta.url),"utf8");
  const page=readFileSync(new URL("../galaxy.html",import.meta.url),"utf8");
  assert.match(script,/credentials:"omit"/);
  assert.match(script,/cache:"no-store"/);
  assert.doesNotMatch(script,/localStorage|sessionStorage|indexedDB|XMLHttpRequest/);
  assert.doesNotMatch(script,/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
  assert.match(page,/read-only|Только чтение/i);
  assert.match(page,/assets\/janus-galaxy\.mjs/);
});
