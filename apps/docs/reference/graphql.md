# GraphQL API

The CMS auto-generates a GraphQL API with queries, mutations, and types for every collection and global. Accessible via `/graphql` with an interactive GraphiQL playground at `/graphiql`.

## Schema

Each collection generates corresponding GraphQL types with pagination support:

```graphql
type Post {
  id: ID!
  title: String!
  slug: String
  content: JSON
  author: User
  status: PostStatus
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum PostStatus {
  draft
  published
}

input PostCreateInput {
  title: String!
  slug: String
  content: JSON
  author: ID
  status: PostStatus
}

input PostUpdateInput {
  title: String!
  slug: String
  content: JSON
  author: ID
  status: PostStatus
}

type PostConnection {
  data: [Post!]!
  total: Int!
  limit: Int!
  offset: Int!
}
```

## Queries

```graphql
type Query {
  listPosts(limit: Int, offset: Int, sort: PostSort, filter: PostFilter): PostConnection!
  getPost(id: ID!): Post
}
```

## Mutations

```graphql
type Mutation {
  createPost(input: PostCreateInput!): Post!
  updatePost(id: ID!, input: PostUpdateInput!): Post!
  deletePost(id: ID!): Boolean!
}
```

## Globals

Globals are also available via GraphQL:

```graphql
type SiteSettings {
  id: ID!
  siteName: String!
  description: String
  logo: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Query {
  getSiteSettings: SiteSettings
}

type Mutation {
  updateSiteSettings(data: SiteSettingsInput!): SiteSettings!
}
```

## Example Queries

```graphql
# List posts with pagination
query {
  listPosts(limit: 10, offset: 0, sort: createdAt_desc) {
    data {
      id
      title
      author {
        id
        name
      }
    }
    total
    limit
    offset
  }
}

# Get single post
query {
  getPost(id: "1") {
    title
    content
    status
  }
}

# Create post
mutation {
  createPost(input: { title: "Hello World", status: published }) {
    id
    title
  }
}

# Get global settings
query {
  getSiteSettings {
    siteName
    description
  }
}

# Update global settings
mutation {
  updateSiteSettings(data: { siteName: "My Blog" }) {
    siteName
  }
}
```

## Authentication

GraphQL endpoints require the same authentication as the REST API. Include a valid JWT token or API token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ listPosts(limit: 5) { data { id title } total } }"}' \
  http://localhost:3000/graphql
```

## Interactive Playground

Visit `/graphiql` in your browser for an interactive GraphQL playground with schema documentation, query autocompletion, and history.
