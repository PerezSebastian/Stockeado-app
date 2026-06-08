import { db } from "@/lib/db";
import type { AssistantActor } from "@/lib/assistant/service";
import type { ResolvedEntityNote } from "@/lib/assistant/query-dsl";

function normalizeLooseText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLooseText(value: string) {
  return normalizeLooseText(value).replace(/\s+/g, "");
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;

    for (let j = 1; j <= right.length; j++) {
      const temp = previous[j];
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + substitutionCost
      );
      diagonal = temp;
    }
  }

  return previous[right.length];
}

function scoreSimilarity(query: string, candidate: string) {
  const normalizedQuery = normalizeLooseText(query);
  const normalizedCandidate = normalizeLooseText(candidate);
  const compactQuery = compactLooseText(query);
  const compactCandidate = compactLooseText(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (
    normalizedQuery === normalizedCandidate ||
    compactQuery === compactCandidate
  ) {
    return 100;
  }
  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return 90;
  }
  if (
    compactCandidate.includes(compactQuery) ||
    compactQuery.includes(compactCandidate)
  ) {
    return 86;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  const tokenMatches = queryTokens.filter((token) =>
    candidateTokens.some(
      (candidateToken) =>
        candidateToken.includes(token) || token.includes(candidateToken)
    )
  ).length;

  let score = 0;
  if (queryTokens.length > 0) {
    score = Math.max(score, Math.round((tokenMatches / queryTokens.length) * 76));
  }

  const distance = levenshteinDistance(compactQuery, compactCandidate);
  const relativeDistance =
    compactQuery.length > 0
      ? distance / Math.max(compactQuery.length, compactCandidate.length)
      : 1;

  if (distance <= 2) {
    score = Math.max(score, 82 - distance * 8);
  } else if (relativeDistance <= 0.28) {
    score = Math.max(score, 72 - Math.round(relativeDistance * 20));
  }

  return score;
}

function confidenceFromScore(score: number) {
  if (score >= 96) return "muy alta";
  if (score >= 84) return "alta";
  if (score >= 70) return "media";
  return "baja";
}

export interface ResolvedIds {
  ids: string[];
  notes: ResolvedEntityNote[];
}

export async function resolveProductQueries(
  actor: AssistantActor,
  queries: string[] | undefined
): Promise<ResolvedIds> {
  if (!queries?.length) return { ids: [], notes: [] };

  const products = await db.product.findMany({
    where: {
      businessId: actor.businessId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      sku: true,
    },
  });

  const matchedIds = new Set<string>();
  const notes: ResolvedEntityNote[] = [];

  for (const query of queries) {
    const ranked = products
      .map((product) => ({
        ...product,
        score: Math.max(
          scoreSimilarity(query, product.name),
          product.sku ? scoreSimilarity(query, product.sku) : 0
        ),
      }))
      .filter((product) => product.score >= 56)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    ranked.forEach((product) => matchedIds.add(product.id));

    if (ranked.length > 0) {
      notes.push({
        type: "product",
        input: query,
        resolved: ranked.map((product) => product.name),
        confidence: confidenceFromScore(ranked[0].score),
      });
    }
  }

  return { ids: [...matchedIds], notes };
}

export async function resolveCategoryQueries(
  actor: AssistantActor,
  queries: string[] | undefined,
  type: "PRODUCT" | "EXPENSE"
): Promise<ResolvedIds> {
  if (!queries?.length) return { ids: [], notes: [] };

  const categories = await db.category.findMany({
    where: {
      businessId: actor.businessId,
      type,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const matchedIds = new Set<string>();
  const notes: ResolvedEntityNote[] = [];

  for (const query of queries) {
    const ranked = categories
      .map((category) => ({
        ...category,
        score: scoreSimilarity(query, category.name),
      }))
      .filter((category) => category.score >= 56)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    ranked.forEach((category) => matchedIds.add(category.id));

    if (ranked.length > 0) {
      notes.push({
        type: "category",
        input: query,
        resolved: ranked.map((category) => category.name),
        confidence: confidenceFromScore(ranked[0].score),
      });
    }
  }

  return { ids: [...matchedIds], notes };
}

export async function resolvePaymentMethodQueries(
  actor: AssistantActor,
  queries: string[] | undefined
): Promise<ResolvedIds> {
  if (!queries?.length) return { ids: [], notes: [] };

  const methods = await db.paymentMethod.findMany({
    where: {
      businessId: actor.businessId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const matchedIds = new Set<string>();
  const notes: ResolvedEntityNote[] = [];

  for (const query of queries) {
    const ranked = methods
      .map((method) => ({
        ...method,
        score: scoreSimilarity(query, method.name),
      }))
      .filter((method) => method.score >= 56)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    ranked.forEach((method) => matchedIds.add(method.id));

    if (ranked.length > 0) {
      notes.push({
        type: "payment_method",
        input: query,
        resolved: ranked.map((method) => method.name),
        confidence: confidenceFromScore(ranked[0].score),
      });
    }
  }

  return { ids: [...matchedIds], notes };
}
