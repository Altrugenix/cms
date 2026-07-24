import { describe, it, expectTypeOf } from "vitest";

import type { ActivityClient } from "../src/activity.js";
import type { AuthClient } from "../src/auth.js";
import type { ArcheClient } from "../src/client-entry.js";
import type { HttpClient, Interceptors } from "../src/client.js";
import type { CollectionClient } from "../src/collection.js";
import type { ApiError, ErrorDetail } from "../src/errors.js";
import type { GlobalClient } from "../src/global.js";
import type { MediaClient, MediaFoldersClient, MediaUploadData } from "../src/media.js";
import type { RolesClient } from "../src/roles.js";
import type { SettingsClient, ApiTokensClient, WebhooksClient } from "../src/settings.js";
import type {
  ArcheConfig,
  ListParams,
  PaginatedResponse,
  AuthResponse,
  RefreshResponse,
  User,
  Role,
  MediaMeta,
  MediaFolder,
  ActivityEntry,
  ApiTokenMeta,
  ApiTokenCreateResponse,
  WebhookMeta,
  Version,
  SetupStatus,
  HttpMethod,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "../src/types.js";
import type { UsersClient } from "../src/users.js";

import { createClient, createHttpClient } from "../src/index.js";

describe("SDK type exports", () => {
  it("exports all public types", () => {
    expectTypeOf<ArcheConfig>().toHaveProperty("baseUrl");
    expectTypeOf<ArcheConfig>().toHaveProperty("token");
    expectTypeOf<ArcheConfig>().toHaveProperty("fetch");

    expectTypeOf<ListParams>().toHaveProperty("limit");
    expectTypeOf<ListParams>().toHaveProperty("offset");
    expectTypeOf<ListParams>().toHaveProperty("sort");
    expectTypeOf<ListParams>().toHaveProperty("select");
    expectTypeOf<ListParams>().toHaveProperty("populate");
    expectTypeOf<ListParams>().toHaveProperty("locale");
    expectTypeOf<ListParams>().toHaveProperty("deleted");
    expectTypeOf<ListParams>().toHaveProperty("where");

    expectTypeOf<PaginatedResponse<unknown>>().toHaveProperty("data");
    expectTypeOf<PaginatedResponse<unknown>>().toHaveProperty("total");
  });

  it("exports all domain types", () => {
    expectTypeOf<User>().toHaveProperty("id");
    expectTypeOf<User>().toHaveProperty("email");
    expectTypeOf<User>().toHaveProperty("role");
    expectTypeOf<User>().toHaveProperty("createdAt");
    expectTypeOf<User>().toHaveProperty("updatedAt");

    expectTypeOf<Role>().toHaveProperty("id");
    expectTypeOf<Role>().toHaveProperty("name");
    expectTypeOf<Role>().toHaveProperty("description");
    expectTypeOf<Role>().toHaveProperty("permissions");

    expectTypeOf<MediaMeta>().toHaveProperty("id");
    expectTypeOf<MediaMeta>().toHaveProperty("filename");
    expectTypeOf<MediaMeta>().toHaveProperty("originalName");
    expectTypeOf<MediaMeta>().toHaveProperty("mimeType");
    expectTypeOf<MediaMeta>().toHaveProperty("size");

    expectTypeOf<MediaFolder>().toHaveProperty("id");
    expectTypeOf<MediaFolder>().toHaveProperty("name");
    expectTypeOf<MediaFolder>().toHaveProperty("parentId");

    expectTypeOf<ActivityEntry>().toHaveProperty("id");
    expectTypeOf<ActivityEntry>().toHaveProperty("action");
    expectTypeOf<ActivityEntry>().toHaveProperty("collection");
    expectTypeOf<ActivityEntry>().toHaveProperty("documentId");

    expectTypeOf<ApiTokenMeta>().toHaveProperty("id");
    expectTypeOf<ApiTokenMeta>().toHaveProperty("name");
    expectTypeOf<ApiTokenMeta>().toHaveProperty("lastFour");

    expectTypeOf<ApiTokenCreateResponse>().toHaveProperty("rawToken");
    expectTypeOf<ApiTokenCreateResponse>().toHaveProperty("token");

    expectTypeOf<WebhookMeta>().toHaveProperty("id");
    expectTypeOf<WebhookMeta>().toHaveProperty("name");
    expectTypeOf<WebhookMeta>().toHaveProperty("url");
    expectTypeOf<WebhookMeta>().toHaveProperty("events");
    expectTypeOf<WebhookMeta>().toHaveProperty("enabled");

    expectTypeOf<Version>().toHaveProperty("id");
    expectTypeOf<Version>().toHaveProperty("version");
    expectTypeOf<Version>().toHaveProperty("data");

    expectTypeOf<SetupStatus>().toHaveProperty("hasAdmin");

    expectTypeOf<AuthResponse>().toHaveProperty("user");
    expectTypeOf<AuthResponse>().toHaveProperty("accessToken");
    expectTypeOf<AuthResponse>().toHaveProperty("refreshToken");

    expectTypeOf<RefreshResponse>().toHaveProperty("accessToken");
    expectTypeOf<RefreshResponse>().toHaveProperty("refreshToken");
  });

  it("exports HttpMethod as string literal union", () => {
    expectTypeOf<HttpMethod>().toEqualTypeOf<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">();
  });

  it("exports ErrorDetail shape", () => {
    expectTypeOf<ErrorDetail>().toHaveProperty("path");
    expectTypeOf<ErrorDetail>().toHaveProperty("message");
    expectTypeOf<ErrorDetail["path"]>().toEqualTypeOf<(string | number)[]>();
  });
});

describe("ArcheClient type", () => {
  it("has collection method with generic type parameter", () => {
    type Client = ArcheClient;
    expectTypeOf<Client>().toHaveProperty("collection");
    expectTypeOf<Client["collection"]>().toBeFunction();
  });

  it("has global method with generic type parameter", () => {
    type Client = ArcheClient;
    expectTypeOf<Client>().toHaveProperty("global");
    expectTypeOf<Client["global"]>().toBeFunction();
  });

  it("has all sub-clients", () => {
    type Client = ArcheClient;
    expectTypeOf<Client>().toHaveProperty("auth");
    expectTypeOf<Client>().toHaveProperty("media");
    expectTypeOf<Client>().toHaveProperty("users");
    expectTypeOf<Client>().toHaveProperty("roles");
    expectTypeOf<Client>().toHaveProperty("activity");
    expectTypeOf<Client>().toHaveProperty("settings");
    expectTypeOf<Client>().toHaveProperty("setToken");
  });

  it("setToken accepts string", () => {
    expectTypeOf<ArcheClient["setToken"]>().parameters.toEqualTypeOf<[string]>();
  });
});

describe("CollectionClient type", () => {
  interface TestDoc {
    id: string;
    title: string;
    count: number;
  }

  it("list returns PaginatedResponse<T>", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<TestDoc>>>();
  });

  it("get returns T", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("create accepts Partial<T> and returns T", () => {
    type Params = Parameters<CollectionClient<TestDoc>["create"]>;
    expectTypeOf<Params>().toEqualTypeOf<[Partial<TestDoc>]>();
    type Result = ReturnType<CollectionClient<TestDoc>["create"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("update accepts id and Partial<T> and returns T", () => {
    type Params = Parameters<CollectionClient<TestDoc>["update"]>;
    expectTypeOf<Params>().toEqualTypeOf<[string, Partial<TestDoc>]>();
    type Result = ReturnType<CollectionClient<TestDoc>["update"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });

  it("bulkDelete returns { deleted: number }", () => {
    type Params = Parameters<CollectionClient<TestDoc>["bulkDelete"]>;
    expectTypeOf<Params>().toEqualTypeOf<[string[]]>();
    type Result = ReturnType<CollectionClient<TestDoc>["bulkDelete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ deleted: number }>>();
  });

  it("publish returns T", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["publish"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("unpublish returns T", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["unpublish"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("restore returns T", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["restore"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("versions returns PaginatedResponse with version data", () => {
    type Result = ReturnType<CollectionClient<TestDoc>["versions"]>;
    expectTypeOf<Result>().toEqualTypeOf<
      Promise<
        PaginatedResponse<{
          id: string;
          version: number;
          data: Record<string, unknown>;
          createdAt: string;
        }>
      >
    >();
  });

  it("restoreVersion returns T", () => {
    type Params = Parameters<CollectionClient<TestDoc>["restoreVersion"]>;
    expectTypeOf<Params>().toEqualTypeOf<[string, string]>();
    type Result = ReturnType<CollectionClient<TestDoc>["restoreVersion"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<TestDoc>>();
  });

  it("list accepts optional ListParams", () => {
    type Params = Parameters<CollectionClient<TestDoc>["list"]>;
    expectTypeOf<Params>().toEqualTypeOf<[ListParams?]>();
  });
});

describe("GlobalClient type", () => {
  interface SiteSettings {
    siteName: string;
    logo: string;
  }

  it("get returns T", () => {
    type Result = ReturnType<GlobalClient<SiteSettings>["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<SiteSettings>>();
  });

  it("upsert accepts Partial<T> and returns T", () => {
    type Params = Parameters<GlobalClient<SiteSettings>["upsert"]>;
    expectTypeOf<Params>().toEqualTypeOf<[Partial<SiteSettings>]>();
    type Result = ReturnType<GlobalClient<SiteSettings>["upsert"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<SiteSettings>>();
  });
});

describe("AuthClient type", () => {
  it("login returns AuthResponse", () => {
    type Result = ReturnType<AuthClient["login"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<AuthResponse>>();
  });

  it("login parameters are strings", () => {
    type Params = Parameters<AuthClient["login"]>;
    expectTypeOf<Params>().toEqualTypeOf<[string, string]>();
  });

  it("refresh returns RefreshResponse", () => {
    type Result = ReturnType<AuthClient["refresh"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<RefreshResponse>>();
  });

  it("forgotPassword returns { message: string }", () => {
    type Result = ReturnType<AuthClient["forgotPassword"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });

  it("resetPassword returns { message: string }", () => {
    type Result = ReturnType<AuthClient["resetPassword"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });

  it("me returns User", () => {
    type Result = ReturnType<AuthClient["me"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<User>>();
  });

  it("setupStatus returns SetupStatus", () => {
    type Result = ReturnType<AuthClient["setupStatus"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<SetupStatus>>();
  });
});

describe("MediaClient type", () => {
  it("list returns PaginatedResponse<MediaMeta>", () => {
    type Result = ReturnType<MediaClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<MediaMeta>>>();
  });

  it("get returns MediaMeta", () => {
    type Result = ReturnType<MediaClient["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<MediaMeta>>();
  });

  it("upload accepts MediaUploadData and returns MediaMeta", () => {
    type Params = Parameters<MediaClient["upload"]>;
    expectTypeOf<Params>().toEqualTypeOf<[MediaUploadData]>();
    type Result = ReturnType<MediaClient["upload"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<MediaMeta>>();
  });

  it("update returns MediaMeta", () => {
    type Result = ReturnType<MediaClient["update"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<MediaMeta>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<MediaClient["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });

  it("getFile returns Response", () => {
    type Result = ReturnType<MediaClient["getFile"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<Response>>();
  });

  it("has folders sub-client", () => {
    expectTypeOf<MediaClient>().toHaveProperty("folders");
    expectTypeOf<MediaClient["folders"]>().toEqualTypeOf<MediaFoldersClient>();
  });
});

describe("MediaFoldersClient type", () => {
  it("list returns PaginatedResponse<MediaFolder>", () => {
    type Result = ReturnType<MediaFoldersClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<MediaFolder>>>();
  });

  it("get returns MediaFolder", () => {
    type Result = ReturnType<MediaFoldersClient["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<MediaFolder>>();
  });

  it("create returns MediaFolder", () => {
    type Result = ReturnType<MediaFoldersClient["create"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<MediaFolder>>();
  });

  it("update returns MediaFolder", () => {
    type Result = ReturnType<MediaFoldersClient["update"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<MediaFolder>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<MediaFoldersClient["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });
});

describe("UsersClient type", () => {
  it("list returns PaginatedResponse<User>", () => {
    type Result = ReturnType<UsersClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<User>>>();
  });

  it("get returns User", () => {
    type Result = ReturnType<UsersClient["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<User>>();
  });

  it("create returns User", () => {
    type Result = ReturnType<UsersClient["create"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<User>>();
  });

  it("update returns User", () => {
    type Result = ReturnType<UsersClient["update"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<User>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<UsersClient["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });
});

describe("RolesClient type", () => {
  it("list returns PaginatedResponse<Role>", () => {
    type Result = ReturnType<RolesClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<Role>>>();
  });

  it("get returns Role", () => {
    type Result = ReturnType<RolesClient["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<Role>>();
  });

  it("create returns Role", () => {
    type Result = ReturnType<RolesClient["create"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<Role>>();
  });

  it("update returns Role", () => {
    type Result = ReturnType<RolesClient["update"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<Role>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<RolesClient["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });
});

/* eslint-disable no-secrets/no-secrets */
describe("ActivityClient type", () => {
  it("list returns PaginatedResponse<ActivityEntry>", () => {
    type Result = ReturnType<ActivityClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<ActivityEntry>>>();
  });
});
/* eslint-enable no-secrets/no-secrets */

describe("SettingsClient type", () => {
  it("has apiTokens sub-client", () => {
    expectTypeOf<SettingsClient>().toHaveProperty("apiTokens");
    expectTypeOf<SettingsClient["apiTokens"]>().toEqualTypeOf<ApiTokensClient>();
  });

  it("has webhooks sub-client", () => {
    expectTypeOf<SettingsClient>().toHaveProperty("webhooks");
    expectTypeOf<SettingsClient["webhooks"]>().toEqualTypeOf<WebhooksClient>();
  });
});

describe("ApiTokensClient type", () => {
  it("list returns PaginatedResponse<ApiTokenMeta>", () => {
    type Result = ReturnType<ApiTokensClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<ApiTokenMeta>>>();
  });

  it("create returns ApiTokenCreateResponse", () => {
    type Result = ReturnType<ApiTokensClient["create"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<ApiTokenCreateResponse>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<ApiTokensClient["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });
});

/* eslint-disable no-secrets/no-secrets */
describe("WebhooksClient type", () => {
  it("list returns PaginatedResponse<WebhookMeta>", () => {
    type Result = ReturnType<WebhooksClient["list"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<PaginatedResponse<WebhookMeta>>>();
  });

  it("get returns WebhookMeta", () => {
    type Result = ReturnType<WebhooksClient["get"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<WebhookMeta>>();
  });

  it("create returns WebhookMeta", () => {
    type Result = ReturnType<WebhooksClient["create"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<WebhookMeta>>();
  });

  it("update returns WebhookMeta", () => {
    type Result = ReturnType<WebhooksClient["update"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<WebhookMeta>>();
  });

  it("delete returns { message: string }", () => {
    type Result = ReturnType<WebhooksClient["delete"]>;
    expectTypeOf<Result>().toEqualTypeOf<Promise<{ message: string }>>();
  });
});
/* eslint-enable no-secrets/no-secrets */

describe("ApiError type", () => {
  it("extends Error", () => {
    expectTypeOf<ApiError>().toMatchTypeOf<Error>();
  });

  it("has status, details, code properties", () => {
    expectTypeOf<ApiError>().toHaveProperty("status");
    expectTypeOf<ApiError>().toHaveProperty("details");
    expectTypeOf<ApiError>().toHaveProperty("code");
    expectTypeOf<ApiError["status"]>().toBeNumber();
    expectTypeOf<ApiError["code"]>().toBeString();
  });
});

describe("HttpClient type", () => {
  it("has request method", () => {
    expectTypeOf<HttpClient>().toHaveProperty("request");
    expectTypeOf<HttpClient["request"]>().toBeFunction();
  });

  it("request method exists and is callable", () => {
    expectTypeOf<HttpClient["request"]>().toBeFunction();
  });
});

describe("Interceptors type", () => {
  it("has request, response, error arrays", () => {
    expectTypeOf<Interceptors>().toHaveProperty("request");
    expectTypeOf<Interceptors>().toHaveProperty("response");
    expectTypeOf<Interceptors>().toHaveProperty("error");
  });

  it("request interceptors are RequestInterceptor arrays", () => {
    expectTypeOf<Interceptors["request"]>().toEqualTypeOf<RequestInterceptor[]>();
  });

  it("response interceptors are ResponseInterceptor arrays", () => {
    expectTypeOf<Interceptors["response"]>().toEqualTypeOf<ResponseInterceptor[]>();
  });

  it("error interceptors are ErrorInterceptor arrays", () => {
    expectTypeOf<Interceptors["error"]>().toEqualTypeOf<ErrorInterceptor[]>();
  });
});

describe("Interceptor function signatures", () => {
  it("RequestInterceptor takes config with baseUrl, url, init", () => {
    type Params = Parameters<RequestInterceptor>;
    type FirstParam = Params[0];
    expectTypeOf<FirstParam>().toHaveProperty("baseUrl");
    expectTypeOf<FirstParam>().toHaveProperty("url");
    expectTypeOf<FirstParam>().toHaveProperty("init");
  });

  it("ResponseInterceptor takes Response", () => {
    type Params = Parameters<ResponseInterceptor>;
    expectTypeOf<Params[0]>().toEqualTypeOf<Response>();
  });

  it("ErrorInterceptor takes Error", () => {
    type Params = Parameters<ErrorInterceptor>;
    expectTypeOf<Params[0]>().toMatchTypeOf<Error>();
  });
});

describe("createClient return type", () => {
  it("returns ArcheClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client).toEqualTypeOf<ArcheClient>();
  });

  it("collection returns CollectionClient with default generic", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    type ColClient = ReturnType<typeof client.collection>;
    void client;
    expectTypeOf<ColClient>().toEqualTypeOf<CollectionClient<Record<string, unknown>>>();
  });

  it("collection with explicit type returns typed client", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    const typed = client.collection<{ title: string }>("posts");
    expectTypeOf(typed).toEqualTypeOf<CollectionClient<{ title: string }>>();
  });

  it("global returns GlobalClient with default generic", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    type GlClient = ReturnType<typeof client.global>;
    void client;
    expectTypeOf<GlClient>().toEqualTypeOf<GlobalClient<Record<string, unknown>>>();
  });

  it("auth is AuthClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client.auth).toEqualTypeOf<AuthClient>();
  });

  it("media is MediaClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client.media).toEqualTypeOf<MediaClient>();
  });

  it("users is UsersClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client.users).toEqualTypeOf<UsersClient>();
  });

  it("roles is RolesClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client.roles).toEqualTypeOf<RolesClient>();
  });

  it("activity is ActivityClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client.activity).toEqualTypeOf<ActivityClient>();
  });

  it("settings is SettingsClient", () => {
    const client = createClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client.settings).toEqualTypeOf<SettingsClient>();
  });
});

describe("createHttpClient return type", () => {
  it("returns HttpClient with interceptors and token methods", () => {
    const http = createHttpClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(http).toHaveProperty("request");
    expectTypeOf(http).toHaveProperty("interceptors");
    expectTypeOf(http).toHaveProperty("setToken");
    expectTypeOf(http).toHaveProperty("getToken");
  });

  it("setToken accepts string", () => {
    const http = createHttpClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(http.setToken).parameters.toEqualTypeOf<[string]>();
  });

  it("getToken returns string | undefined", () => {
    const http = createHttpClient({ baseUrl: "http://localhost:3000" });
    expectTypeOf(http.getToken()).toEqualTypeOf<string | undefined>();
  });
});

describe("ArcheConfig type constraints", () => {
  it("baseUrl is required string", () => {
    expectTypeOf<ArcheConfig["baseUrl"]>().toBeString();
  });

  it("token is optional string", () => {
    expectTypeOf<ArcheConfig["token"]>().toEqualTypeOf<string | undefined>();
  });

  it("fetch is optional function", () => {
    expectTypeOf<ArcheConfig["fetch"]>().toEqualTypeOf<typeof globalThis.fetch | undefined>();
  });
});

describe("PaginatedResponse type parameterization", () => {
  it("works with User type", () => {
    type Result = PaginatedResponse<User>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<User[]>();
    expectTypeOf<Result["total"]>().toBeNumber();
  });

  it("works with Role type", () => {
    type Result = PaginatedResponse<Role>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<Role[]>();
  });

  it("works with MediaMeta type", () => {
    type Result = PaginatedResponse<MediaMeta>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<MediaMeta[]>();
  });

  it("works with ActivityEntry type", () => {
    type Result = PaginatedResponse<ActivityEntry>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<ActivityEntry[]>();
  });

  it("works with WebhookMeta type", () => {
    type Result = PaginatedResponse<WebhookMeta>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<WebhookMeta[]>();
  });

  it("works with ApiTokenMeta type", () => {
    type Result = PaginatedResponse<ApiTokenMeta>;
    expectTypeOf<Result["data"]>().toEqualTypeOf<ApiTokenMeta[]>();
  });
});
