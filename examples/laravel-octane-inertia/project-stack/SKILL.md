# Project Stack — Laravel 12 + Octane/Swoole + Inertia SSR

## Stack Overview

**Backend:**
- Language: PHP 8.3+ (readonly properties, fibers, enums)
- Framework: Laravel 12
- Runtime: Laravel Octane + Swoole — **persistent workers, no FPM lifecycle**
- API style: No separate REST API — Inertia.js handles page responses
- Auth: Laravel Sanctum / Fortify

**Frontend:**
- Language: TypeScript 5
- Framework: Vue 3 — Composition API, `<script setup>`
- Meta-framework: Inertia.js — Laravel controller returns `Inertia::render()`, not JSON
- Rendering: SSR enabled (Node.js) — first render is server-side, Vue hydrates after
- Styling: Tailwind CSS v4 — design tokens in `tailwind.config.ts`
- State: Pinia (global), `useForm()` (forms), composables (local)
- Build: Vite
- Testing: Vitest + Vue Testing Library (unit), Playwright (E2E)

**Databases:**
- Primary: MySQL 8 — Eloquent ORM
- Cache / Session / Queues: Redis — prefix all keys per domain
- Analytics: ClickHouse — time-series and raw events, NOT via Eloquent
- Queue dashboard: Laravel Horizon at `/horizon`

**Testing:**
- Backend: Pest PHP (feature + unit)
- Frontend: Vitest + Vue Testing Library

**Infrastructure:**
- Containers: Docker + docker-compose
- Queue manager: Laravel Horizon (Redis-backed)

---

## Test Commands

```bash
# Run all backend tests
php artisan test

# Run a specific test class
php artisan test --filter=ClassName

# Run with coverage
php artisan test --coverage

# Run frontend tests
npm run test

# E2E
npx playwright test
```

---

## Build & Dev Commands

```bash
# Start Octane dev server
php artisan octane:start --watch

# Start SSR + Vite
npm run dev

# Production build
npm run build

# Type check
npx vue-tsc --noEmit
```

---

## Project Structure

```
app/
├── Actions/          # Single-responsibility action classes
├── Http/
│   ├── Controllers/  # Thin — delegate to Actions
│   ├── Requests/     # FormRequest validation
│   └── Resources/    # API / Inertia response shaping
├── Models/           # Eloquent models
├── Services/         # Multi-step orchestration
└── Events/ Listeners/ Jobs/

resources/
└── js/
    ├── Pages/        # Inertia page components (path = component name)
    ├── Components/   # Shared Vue components
    ├── Layouts/      # AppLayout, AuthLayout, etc.
    ├── Composables/  # Reusable logic
    └── Types/        # Generated TypeScript types
```

---

## Critical Runtime Constraints — Octane/Swoole

**Octane workers are long-lived. Any state stored outside the request lifecycle bleeds into subsequent requests.**

### Static properties — FORBIDDEN

```php
// ❌ BAD — leaks between requests
class OrderService {
    private static array $cache = [];
}

// ✅ GOOD — inject Redis or use scoped container binding
class OrderService {
    public function __construct(private Redis $redis) {}
}
```

### Singleton state mutation — FORBIDDEN

```php
// ❌ BAD — singleton is reused, $user bleeds across requests
class AuthContext {
    private ?User $user = null;
    public function setUser(User $user): void { $this->user = $user; }
}

// ✅ GOOD — use Laravel's auth() or request() helpers (request-scoped)
```

### Safe: Request-scoped container bindings

```php
// In ServiceProvider — fresh instance per request
$this->app->scoped(MyService::class, fn() => new MyService());
```

### Database connections

- Eloquent connections are managed by Octane — safe to use normally
- Custom PDO / raw connections: close after use in `finally`
- ClickHouse HTTP client: use a **new instance per request** or verified connection pool

### File handles / streams

Always close in `finally` — workers are not garbage collected between requests.

### Queue workers (Horizon)

- Queue workers run in separate Swoole coroutines — same memory rules apply
- Pass IDs in job payloads, not Eloquent models
- Long jobs must check `$this->shouldTerminate()` for graceful shutdown

### Backend checklist before every commit

- [ ] No `static` properties storing request data
- [ ] No `app()->instance()` calls that mutate shared container state
- [ ] All file handles closed in `finally`
- [ ] ClickHouse client: fresh instance or pool verified
- [ ] Tested with `php artisan octane:start --workers=4` locally

---

## Critical Runtime Constraints — Inertia SSR

**SSR runs server-side in Node.js. Browser APIs do not exist at render time.**

### Browser APIs — defer to onMounted

```typescript
// ❌ BAD — window does not exist during SSR
const isMobile = window.innerWidth < 768

// ✅ GOOD
import { ref, onMounted } from 'vue'
const isMobile = ref(false)
onMounted(() => { isMobile.value = window.innerWidth < 768 })
```

```typescript
// ❌ BAD — localStorage does not exist during SSR
const token = localStorage.getItem('token')

// ✅ GOOD — use cookies (server-accessible) or defer to onMounted
```

### Frontend checklist before every commit

- [ ] No `window` / `document` / `localStorage` at `<script setup>` top level
- [ ] Forms use `useForm()` — not raw axios or fetch
- [ ] Shared data via `usePage().props` — not hardcoded
- [ ] Component tested with Vitest (at minimum: renders without error)
- [ ] SSR verified: `npm run build && npm run preview` — no hydration warnings

---

## Architecture Patterns

### Request handling (backend)
```
Route → Controller (thin) → FormRequest (validation) → Action (business logic) → Response
```

### Action class pattern
```php
class CreateOrder
{
    public function execute(array $data): Order
    {
        // single responsibility — one action, one thing
    }
}
```

### Inertia page response
```php
public function index(Request $request): Response
{
    return Inertia::render('Orders/Index', [
        'orders'  => OrderResource::collection($this->orders->paginate()),
        'filters' => $request->only(['search', 'status']),
    ]);
}

// After mutation — redirect, Inertia follows automatically
public function store(StoreOrderRequest $request): RedirectResponse
{
    $order = (new CreateOrder)->execute($request->validated());
    return redirect()->route('orders.show', $order)
        ->with('flash.success', 'Order created.');
}
```

### Vue page component
```vue
<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '@/Layouts/AppLayout.vue'

const props = defineProps<{
  orders: App.Data.OrderData[]
  filters: App.Data.FilterData
}>()
</script>

<template>
  <Head title="Orders" />
  <AppLayout>
    <!-- content -->
  </AppLayout>
</template>
```

### Forms — always use useForm()
```typescript
import { useForm } from '@inertiajs/vue3'

const form = useForm({ email: '', password: '' })

function submit() {
    form.post(route('login'), {
        preserveScroll: true,
        onSuccess: () => form.reset('password'),
    })
}
```

### Shared data access
```typescript
import { usePage } from '@inertiajs/vue3'

const page = usePage()
const auth  = computed(() => page.props.auth)   // { user: {...} }
const flash = computed(() => page.props.flash)  // { success: '...', error: '...' }
```

### Partial reloads (search / filter)
```typescript
import { router } from '@inertiajs/vue3'
router.reload({ only: ['orders'] })  // re-fetches only the 'orders' prop
```

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| DB tables | snake_case plural | `order_items` |
| Eloquent models | PascalCase singular | `OrderItem` |
| Action classes | PascalCase + verb noun | `CreateOrder`, `SendInvoice` |
| Controllers | PascalCase + Controller | `OrderController` |
| Vue pages | PascalCase, path-based | `Pages/Orders/Index.vue` |
| Vue components | PascalCase | `OrderStatusBadge.vue` |
| Composables | camelCase, use prefix | `useOrderFilters.ts` |
| Pinia stores | camelCase, Store suffix | `useCartStore.ts` |
| API routes | kebab-case | `/api/order-items` |
| Named routes | dot notation | `orders.show` |
| Redis keys | `domain:entity:id` | `cart:user:42` |

---

## ClickHouse — Analytics Only

ClickHouse is for read-heavy analytics. Writes go through a dedicated pipeline — never write directly from a controller or action.

```php
// ✅ Correct — reading analytics data
$stats = ClickHouse::select('SELECT count() FROM events WHERE date = today()');

// ❌ Wrong — never write from request cycle
ClickHouse::insert('INSERT INTO events ...'); // use a queued job instead
```

---

## TypeScript Types

Generate Laravel model types:
```bash
php artisan typescript:transform
```

Types live in `resources/js/Types/` — import as `App.Data.OrderData`.
