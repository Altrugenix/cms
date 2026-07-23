import {
  where,
  orderBy,
  limit,
  startAfter,
  type QueryConstraint,
  type DocumentSnapshot,
} from "firebase/firestore";

export interface FilterOperator {
  op: string;
  value: unknown;
}

export type FilterValue = unknown | FilterOperator;

export interface QueryBuilderParams {
  filters?: Record<string, FilterValue>;
  sort?: string;
  offset?: number;
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot;
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return typeof value === "object" && value !== null && "op" in value && "value" in value;
}

function buildWhereConstraints(filters: Record<string, FilterValue>): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  for (const [field, value] of Object.entries(filters)) {
    if (isFilterOperator(value)) {
      switch (value.op) {
        case "eq":
          constraints.push(where(field, "==", value.value));
          break;
        case "ne":
          constraints.push(where(field, "!=", value.value));
          break;
        case "gt":
          constraints.push(where(field, ">", value.value));
          break;
        case "gte":
          constraints.push(where(field, ">=", value.value));
          break;
        case "lt":
          constraints.push(where(field, "<", value.value));
          break;
        case "lte":
          constraints.push(where(field, "<=", value.value));
          break;
        case "in":
          constraints.push(
            where(field, "in", Array.isArray(value.value) ? value.value : [value.value]),
          );
          break;
        case "array-contains":
          constraints.push(where(field, "array-contains", value.value));
          break;
        case "array-contains-any":
          constraints.push(
            where(
              field,
              "array-contains-any",
              Array.isArray(value.value) ? value.value : [value.value],
            ),
          );
          break;
        default:
          constraints.push(where(field, "==", value));
      }
    } else {
      constraints.push(where(field, "==", value));
    }
  }

  return constraints;
}

function buildSortConstraints(sort: string): QueryConstraint[] {
  if (!sort) return [];

  return sort.split(",").map((part) => {
    const segments = part.trim().split(":");
    const field = segments[0] ?? "";
    const direction = (segments[1] ?? "asc") as "asc" | "desc";
    return orderBy(field, direction);
  });
}

export function buildQueryConstraints(params: QueryBuilderParams): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (params.filters) {
    constraints.push(...buildWhereConstraints(params.filters));
  }

  constraints.push(...buildSortConstraints(params.sort ?? ""));

  if (params.startAfterDoc) {
    constraints.push(startAfter(params.startAfterDoc));
  }

  if (params.offset && !params.startAfterDoc) {
    constraints.push(startAfter(params.offset));
  }

  if (params.pageSize) {
    constraints.push(limit(params.pageSize));
  }

  return constraints;
}

export interface QueryBuilder {
  where(field: string, value: FilterValue): QueryBuilder;
  sort(field: string, direction?: "asc" | "desc"): QueryBuilder;
  paginate(pageSize: number, offset?: number): QueryBuilder;
  startAfter(doc: DocumentSnapshot): QueryBuilder;
  build(): QueryConstraint[];
  getFilters(): Record<string, FilterValue> | undefined;
}

export function createQueryBuilder(): QueryBuilder {
  const state: QueryBuilderParams = {
    filters: {},
    offset: 0,
    pageSize: 25,
  };

  const builder: QueryBuilder = {
    build(): QueryConstraint[] {
      return buildQueryConstraints(state);
    },

    getFilters(): Record<string, FilterValue> | undefined {
      return state.filters;
    },

    paginate(pageSize: number, offset = 0): QueryBuilder {
      state.pageSize = pageSize;
      state.offset = offset;
      return builder;
    },

    sort(field: string, direction: "asc" | "desc" = "asc"): QueryBuilder {
      state.sort = state.sort ? `${state.sort},${field}:${direction}` : `${field}:${direction}`;
      return builder;
    },

    startAfter(doc: DocumentSnapshot): QueryBuilder {
      state.startAfterDoc = doc;
      return builder;
    },

    where(field: string, value: FilterValue): QueryBuilder {
      state.filters = state.filters ?? {};
      state.filters[field] = value;
      return builder;
    },
  };

  return builder;
}
