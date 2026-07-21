const { EvidenceError } = require('./errors');

const rank = { READ: 1, CONTRIBUTE: 2, REVIEW: 3, ADMINISTER: 4 };

async function orderAccess(tx, actor, serviceOrderId) {
  const order = await tx.serviceOrder.findUnique({
    where: { id: serviceOrderId },
    select: {
      id: true,
      technician: { select: { userId: true } },
      evidenceAccessGrants: {
        where: { userId: actor.id, revokedAt: null },
        select: { accessLevel: true, privilegedAccess: true },
      },
    },
  });
  if (!order) throw new EvidenceError('SERVICE_ORDER_NOT_FOUND', 'Service order was not found', 404);
  if (actor.role === 'ADMIN') return { order, accessLevel: 'ADMINISTER', privilegedAccess: true };
  const grant = order.evidenceAccessGrants[0];
  if (grant) return { order, ...grant };
  if (order.technician?.userId === actor.id) return { order, accessLevel: 'CONTRIBUTE', privilegedAccess: false };
  throw new EvidenceError('ORDER_ACCESS_DENIED', 'This user has no active access grant for the service order', 403);
}

async function requireOrderAccess(tx, actor, serviceOrderId, required, privileged = false) {
  const access = await orderAccess(tx, actor, serviceOrderId);
  if (rank[access.accessLevel] < rank[required]) {
    throw new EvidenceError('ORDER_ACCESS_DENIED', `${required} access is required`, 403);
  }
  if (privileged && !access.privilegedAccess) {
    throw new EvidenceError('PRIVILEGED_ACCESS_REQUIRED', 'Privileged evidence access is required', 403);
  }
  return access;
}

module.exports = { rank, orderAccess, requireOrderAccess };
