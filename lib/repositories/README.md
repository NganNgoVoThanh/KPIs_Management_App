# Database Repository Pattern

## Tổng quan

Thư mục này chứa implementation của **Repository Pattern** cho phép ứng dụng hỗ trợ nhiều loại database khác nhau mà không cần thay đổi code business logic.

## Cấu trúc thư mục

```
lib/repositories/
├── IRepository.ts              # Interface definitions (contract)
├── MySQLRepository.ts          # MySQL/Prisma implementation
├── OneLakeRepository.ts        # Microsoft Fabric OneLake implementation
├── DatabaseFactory.ts          # Factory pattern for database selection
└── README.md                   # This file
```

## Cách hoạt động

### 1. Interface (IRepository.ts)

Định nghĩa contract cho tất cả database operations:

```typescript
export interface IDatabaseRepository {
  // User operations
  getUsers(filters?: { role?: string }): Promise<any[]>
  getUserById(id: string): Promise<any | null>
  createUser(data: any): Promise<any>

  // Cycle operations
  getCycles(status?: string): Promise<any[]>
  getCycleById(id: string): Promise<any | null>

  // ... và nhiều methods khác
}
```

### 2. Implementation Classes

Mỗi database có 1 class implement `IDatabaseRepository`:

**MySQLRepository.ts** - Sử dụng Prisma ORM
```typescript
export class MySQLRepository implements IDatabaseRepository {
  async getUsers(filters?: any) {
    return await prisma.user.findMany({ where: filters })
  }
}
```

**OneLakeRepository.ts** - Sử dụng Fabric SQL Endpoint
```typescript
export class OneLakeRepository implements IDatabaseRepository {
  async getUsers(filters?: any) {
    const query = "SELECT * FROM users WHERE role = ?"
    return await this.executeQuery(query, [filters.role])
  }
}
```

### 3. Factory Pattern (DatabaseFactory.ts)

Tự động chọn database dựa trên environment variable:

```typescript
export class DatabaseFactory {
  static getInstance(): IDatabaseRepository {
    const dbType = process.env.DB_TYPE

    switch (dbType) {
      case 'mysql':
        return new MySQLRepository()
      case 'onelake':
        return new OneLakeRepository()
      default:
        return new MySQLRepository()
    }
  }
}
```

## Sử dụng trong code

### Cách cũ (direct Prisma):
```typescript
import { prisma } from '@/lib/db'

const users = await prisma.user.findMany({
  where: { role: 'ADMIN' }
})
```

### Cách mới (Repository Pattern):
```typescript
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

const db = getDatabase()
const users = await db.getUsers({ role: 'ADMIN' })
```

**Ưu điểm:**
- Thay đổi database chỉ cần đổi `DB_TYPE` trong `.env`
- Không cần sửa code business logic
- Dễ dàng test với mock database

## Thêm database mới

### Bước 1: Tạo Repository Implementation

```typescript
// lib/repositories/PostgreSQLRepository.ts
import { IDatabaseRepository } from './IRepository'
import { Pool } from 'pg'

export class PostgreSQLRepository implements IDatabaseRepository {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_URL
    })
  }

  async getUsers(filters?: any): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE role = $1',
      [filters?.role]
    )
    return result.rows
  }

  // Implement tất cả methods từ IDatabaseRepository
}
```

### Bước 2: Update DatabaseFactory

```typescript
// lib/repositories/DatabaseFactory.ts
import { PostgreSQLRepository } from './PostgreSQLRepository'

private static createDatabase(): IDatabaseRepository {
  const dbType = process.env.DB_TYPE

  switch (dbType) {
    case 'mysql':
      return new MySQLRepository()
    case 'onelake':
      return new OneLakeRepository()
    case 'postgres':  // ← Thêm case mới
      return new PostgreSQLRepository()
    default:
      return new MySQLRepository()
  }
}
```

### Bước 3: Update .env

```bash
DB_TYPE="postgres"
POSTGRES_URL="postgresql://user:password@localhost:5432/kpi_db"
```

### Bước 4: Done! 🎉

Không cần thay đổi gì trong API routes hay business logic.

## Testing

### Unit Test với Mock Repository

```typescript
import { DatabaseFactory } from '@/lib/repositories/DatabaseFactory'

describe('KPI API', () => {
  beforeEach(() => {
    // Mock database for testing
    const mockDb = {
      getUsers: jest.fn().mockResolvedValue([
        { id: '1', name: 'Test User' }
      ])
    }
    DatabaseFactory.setInstance(mockDb)
  })

  it('should get users', async () => {
    const db = DatabaseFactory.getInstance()
    const users = await db.getUsers()
    expect(users).toHaveLength(1)
  })
})
```

### Integration Test với Multiple Databases

```typescript
describe.each(['mysql', 'onelake'])('Database: %s', (dbType) => {
  beforeEach(() => {
    process.env.DB_TYPE = dbType
    DatabaseFactory.resetInstance()
  })

  it('should retrieve users', async () => {
    const db = DatabaseFactory.getInstance()
    const users = await db.getUsers({ role: 'ADMIN' })
    expect(users).toBeDefined()
  })
})
```

## Performance Tips

### 1. Connection Pooling

```typescript
export class MySQLRepository implements IDatabaseRepository {
  private static client: PrismaClient

  constructor() {
    if (!MySQLRepository.client) {
      MySQLRepository.client = new PrismaClient({
        // Connection pool settings
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      })
    }
  }
}
```

### 2. Query Optimization

```typescript
// Bad: N+1 query problem
const users = await db.getUsers()
for (const user of users) {
  const orgUnit = await db.getOrgUnitById(user.orgUnitId)
}

// Good: Join query
const users = await db.getUsers() // Already includes orgUnit via JOIN
```

### 3. Caching

```typescript
export class CachedRepository implements IDatabaseRepository {
  private cache = new Map()
  private repository: IDatabaseRepository

  constructor(repository: IDatabaseRepository) {
    this.repository = repository
  }

  async getUserById(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id)
    }
    const user = await this.repository.getUserById(id)
    this.cache.set(id, user)
    return user
  }
}
```

## Migration Strategy

### Phase 1: Dual-write (Current)
- Write to both MySQL and OneLake
- Read from MySQL (primary)
- Verify data consistency

### Phase 2: Switch reads
- Write to both databases
- Read from OneLake
- Fallback to MySQL on errors

### Phase 3: Full migration
- Write only to OneLake
- MySQL becomes backup
- Can rollback by changing `DB_TYPE`

## Common Patterns

### Transaction Support

```typescript
const db = getDatabase()

await db.transaction(async (tx) => {
  await tx.createUser({ name: 'John' })
  await tx.createKpiDefinition({ userId: 'john-id' })
  // Both operations succeed or both fail
})
```

### Batch Operations

```typescript
const db = getDatabase()

// Batch insert
const users = [
  { name: 'User 1' },
  { name: 'User 2' },
  { name: 'User 3' }
]

await db.transaction(async (tx) => {
  for (const user of users) {
    await tx.createUser(user)
  }
})
```

### Error Handling

```typescript
const db = getDatabase()

try {
  const user = await db.getUserById(id)
  if (!user) {
    throw new Error('User not found')
  }
  return user
} catch (error) {
  console.error('Database error:', error)
  // Fallback or retry logic
}
```

## Troubleshooting

### Issue: "Method not implemented"

**Solution:** Implement the method in your repository class:

```typescript
async getUsers(filters?: any): Promise<any[]> {
  throw new Error('getUsers not yet implemented')
}
```

### Issue: Type errors with IDatabaseRepository

**Solution:** Ensure your class implements ALL methods from the interface:

```typescript
export class MyRepository implements IDatabaseRepository {
  // Must implement EVERY method from IDatabaseRepository
}
```

### Issue: Database connection errors

**Solution:** Check environment variables:

```bash
# .env
DB_TYPE="mysql"
DATABASE_URL="mysql://user:pass@localhost:3306/db"
```

## References

- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)
- [Strategy Pattern](https://en.wikipedia.org/wiki/Strategy_pattern)

## Contributing

Khi thêm database mới:
1. Implement `IDatabaseRepository`
2. Add case trong `DatabaseFactory`
3. Update `.env.example`
4. Write tests
5. Update documentation
