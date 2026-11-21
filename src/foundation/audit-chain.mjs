import { createHash } from 'node:crypto';

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function computeAuditHash(event) {
  const payload = canonicalJson({
    sequence: event.sequence,
    organizationId: event.organizationId,
    actorIdentityId: event.actorIdentityId,
    action: event.action,
    objectType: event.objectType,
    objectId: event.objectId,
    occurredAt: event.occurredAt,
    previousHash: event.previousHash ?? null,
    evidence: event.evidence ?? null
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function appendAuditEvent(previousEvent, input) {
  const event = {
    sequence: previousEvent ? previousEvent.sequence + 1 : 1,
    organizationId: input.organizationId,
    actorIdentityId: input.actorIdentityId,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    previousHash: previousEvent ? previousEvent.eventHash : null,
    evidence: input.evidence ?? null
  };
  return Object.freeze({ ...event, eventHash: computeAuditHash(event) });
}

export function verifyAuditChain(events) {
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const expectedPreviousHash = index === 0 ? null : events[index - 1].eventHash;
    if (event.previousHash !== expectedPreviousHash) return false;
    if (event.eventHash !== computeAuditHash(event)) return false;
  }
  return true;
}
