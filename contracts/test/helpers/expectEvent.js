import { assert } from "chai";

export function expectEventsInLogs(logs, eventName) {
  const event = logs.find(e => e.event === eventName);
  assert.exists(event);
}

export default async function expectEventsInTransaction(tx, eventName) {
  const { logs } = await tx;
  return expectEventsInLogs(logs, eventName);
}
