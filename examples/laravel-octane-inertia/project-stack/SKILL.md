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
php artisan test
php artisan test --filter=ClassName
php artisan test --coverage
npm run test
npx playwright test
```

---

## Build & Dev Commands

```bash
php artisan octane:start --watch
npm run dev
npm run build
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
$this->app->scoped(MyService::class, fn() => new MyService());
```

### Backend checklist before every commit

- [ ] No `static` properties storing request data
- [ ] No `app()->instance()` calls that mutate shared container state
- [ ] All file handles closed in `finally`
- [ ] ClickHouse client: fresh instance or pool verified
- [ ] Tested with `php artisan octane:start --workers=4` locally

---

## Critical Runtime Constraints — Inertia SSR

**SSR runs server-side in Node.js. Browser APIs do not exist at render time.**

```typescript
// ❌ BAD — window does not exist during SSR
const isMobile = window.innerWidth < 768

// ✅ GOOD
import { ref, onMounted } from 'vue'
const isMobile = ref(false)
onMounted(() => { isMobile.value = window.innerWidth < 768 })
```

### Frontend checklist before every commit

- [ ] No `window` / `document` / `localStorage` at `<script setup>` top level
- [ ] Forms use `useForm()` — not raw axios or fetch
- [ ] Shared data via `usePage().props` — not hardcoded
- [ ] Component tested with Vitest (at minimum: renders without error)

---

## Architecture Patterns

### Request handling (backend)

```
Route → Controller (thin) → FormRequest (validation) → Action (business logic) → Response
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
