# AmPac Production Readiness Spec

**Date:** December 22, 2025  
**Status:** Pre-Production  
**Target Launch:** TBD

---

## Executive Summary

The AmPac application suite (Mobile, Console, Brain API) requires several critical and important improvements before production deployment. This document outlines the work needed organized by priority and effort.

---

## 🔴 P0 - BLOCKERS (Must fix before any production use)

### 1. Security: Remove Exposed Credentials
**Effort:** 1-2 hours | **Risk:** Critical

| Task | Location | Action |
|------|----------|--------|
| Firebase API key exposed | `apps/console/.env.example` | Replace real key with placeholder |
| Default JWT secret | `apps/brain/app/core/config.py` | Require explicit env var, fail startup if missing |
| AUTH_DISABLED flag | `apps/brain/.env` | Gate to dev-only via explicit check |

```python
# Example fix for config.py startup validation
def validate_production_config(settings):
    errors = []
    if settings.AUTH_DISABLED and os.getenv("ENV") == "production":
        errors.append("AUTH_DISABLED cannot be True in production")
    if settings.JWT_SECRET == "ampac-secret-key-change-in-production":
        errors.append("JWT_SECRET must be changed from default")
    if errors:
        raise ValueError(f"Config validation failed: {errors}")
```

### 2. Security: API Authentication
**Effort:** 4-6 hours | **Risk:** Critical

| Task | Current State | Required |
|------|---------------|----------|
| Brain API public access | Cloud Run `--allow-unauthenticated` | Add API key middleware or IAM |
| Rate limiting | In-memory (won't scale) | Redis-backed rate limiter |
| Console dev bypass | localStorage flag | Remove or add IP whitelist |

**Implementation:**
- Add `X-API-Key` header validation middleware to Brain
- Deploy Redis (Cloud Memorystore or Upstash) for rate limiting
- Remove `ampac_dev_bypass` from production builds

### 3. Environment Configuration
**Effort:** 2-3 hours | **Risk:** High

| Task | Action |
|------|--------|
| Create mobile `.env.example` | Add template with all EXPO_PUBLIC_ vars |
| Validate Brain startup | Add config validation, fail fast if critical keys missing |
| Separate dev/staging/prod configs | Create `.env.production`, `.env.staging` templates |

**Required Environment Variables:**
```bash
# Brain - Required for Production
OPENAI_API_KEY=required
STRIPE_SECRET_KEY=required
STRIPE_WEBHOOK_SECRET=required
FIREBASE_CREDENTIALS_PATH=required
JWT_SECRET=required  # Must not be default

# Brain - Optional but Recommended
AZURE_TENANT_ID=optional  # For Graph calendar
VENTURES_USERNAME=optional  # For loan sync
```

---

## 🟠 P1 - HIGH PRIORITY (Within 1 week of launch)

### 4. Error Monitoring & Reporting
**Effort:** 4-6 hours | **Risk:** Medium-High

**Tasks:**
- [ ] Set up Sentry project for AmPac
- [ ] Add Sentry SDK to mobile app (`@sentry/react-native`)
- [ ] Add Sentry SDK to Brain API (`sentry-sdk[fastapi]`)
- [ ] Add Sentry SDK to console (`@sentry/react`)
- [ ] Connect ErrorBoundary to Sentry
- [ ] Add structured error logging to Brain

**Files to modify:**
- `apps/mobile/App.tsx` - Initialize Sentry
- `apps/mobile/src/components/ErrorBoundary.tsx` - Report to Sentry
- `apps/brain/app/main.py` - Add Sentry middleware
- `apps/console/src/main.tsx` - Initialize Sentry

### 5. CI/CD Pipelines
**Effort:** 8-12 hours | **Risk:** Medium

**Missing Pipelines:**
| App | Current | Needed |
|-----|---------|--------|
| Mobile | None | Expo EAS Build + Preview |
| Console | None | Vite Build + Firebase Hosting |
| Brain | Partial (no tests) | Add pytest, coverage |

**Recommended Workflow Structure:**
```yaml
# .github/workflows/mobile-ci.yml
- Run lint (eslint)
- Run type check (tsc)
- Run unit tests (jest)
- Build preview (expo build:web)

# .github/workflows/console-ci.yml  
- Run lint (eslint)
- Run type check (tsc)
- Build (vite build)
- Deploy preview to Firebase Hosting

# .github/workflows/brain-ci.yml (update existing)
- Run pytest with coverage
- Require 60% coverage minimum
- Deploy to Cloud Run staging on PR merge
```

### 6. Database Security & Backups
**Effort:** 3-4 hours | **Risk:** Medium

**Tasks:**
- [ ] Enable Firestore daily backups to Cloud Storage
- [ ] Set up backup retention policy (30 days)
- [ ] Test restore procedure
- [ ] Document recovery runbook

**Firestore Rules Audit:**
- [x] Rooms - Public read ✓
- [x] Channels - Member-only ✓
- [x] Calendar Events - Owner-only ✓
- [ ] Add Firestore rules unit tests

### 7. Staging Environment
**Effort:** 4-6 hours | **Risk:** Medium

**Setup Required:**
- [ ] Create Firebase project `ampac-staging`
- [ ] Create Cloud Run service `brain-staging`
- [ ] Create separate Stripe test keys for staging
- [ ] Configure DNS for staging URLs
- [ ] Add staging deploy workflow

**URLs:**
- Mobile: Expo Go with staging config
- Console: `console-staging.ampac.com`
- Brain: `brain-staging.ampac.com`

---

## 🟡 P2 - MEDIUM PRIORITY (Within 1 month)

### 8. Testing Coverage
**Effort:** 20-30 hours | **Risk:** Medium

**Current State:**
| App | Tests | Coverage |
|-----|-------|----------|
| Mobile | 5 files | <10% |
| Console | 0 files | 0% |
| Brain | 0 files | 0% |

**Target:** 60% coverage minimum

**Priority Test Areas:**
1. **Mobile Services** (Highest ROI)
   - `applicationStore.ts` - Sync logic
   - `personalCalendarService.ts` - CRUD operations
   - `stripeService.ts` - Payment flows
   
2. **Brain API Endpoints**
   - `/stripe/*` - Payment flows
   - `/applications/*` - Loan operations
   - `/calendar/*` - Booking flows

3. **Firestore Rules**
   - Use `@firebase/rules-unit-testing`
   - Test all collections for read/write permissions

### 9. Mobile App Polish
**Effort:** 15-20 hours | **Risk:** Low-Medium

| Feature | Current State | Action |
|---------|---------------|--------|
| Push Notifications | Service exists, no registration | Add Expo Push Token registration |
| Offline Mode | OfflineBanner exists | Add persistent offline indicator |
| Deep Linking | Not configured | Add URL scheme handling |
| App Icons | Default | Add production app icons |
| Splash Screen | Basic | Add branded splash with animation |
| Error States | Inconsistent | Standardize empty/error states |

### 10. Console App Features
**Effort:** 10-15 hours | **Risk:** Low

**Missing Pages:**
- [ ] Settings page (currently placeholder)
- [ ] Search functionality (currently "Coming Soon")
- [ ] User management for admins

**UI Polish:**
- [ ] Add loading skeletons
- [ ] Add error boundaries per route
- [ ] Improve mobile responsiveness

### 11. Performance Optimization
**Effort:** 8-12 hours | **Risk:** Low

**Mobile:**
- [ ] Add React Query for server state caching
- [ ] Implement image lazy loading
- [ ] Add bundle size monitoring
- [ ] Profile and optimize re-renders

**Brain:**
- [ ] Add Redis caching for frequent queries
- [ ] Implement connection pooling
- [ ] Add response compression
- [ ] Profile slow endpoints

**Console:**
- [ ] Code splitting for routes
- [ ] Lazy load heavy components (charts)
- [ ] Add service worker for caching

---

## 🟢 P3 - NICE TO HAVE (Post-launch)

### 12. Documentation
**Effort:** 10-15 hours

- [ ] Architecture diagram (system overview)
- [ ] API documentation (beyond OpenAPI)
- [ ] Firestore schema documentation
- [ ] Runbook for common incidents
- [ ] Onboarding guide for developers

### 13. Observability
**Effort:** 8-12 hours

- [ ] Structured logging (JSON format)
- [ ] Log aggregation (Cloud Logging or Datadog)
- [ ] Custom dashboards for key metrics
- [ ] Alerting for error rates, latency
- [ ] Uptime monitoring

### 14. Advanced Features
**Effort:** Variable

- [ ] Stripe Elements UI for card input
- [ ] Microsoft Graph calendar sync (requires AAD app)
- [ ] Two-factor authentication
- [ ] Audit logging for compliance
- [ ] Data export for GDPR compliance

---

## Implementation Timeline

### Week 1: Security & Stability
| Day | Tasks |
|-----|-------|
| 1 | P0 #1-2: Remove exposed creds, add API auth |
| 2 | P0 #3: Environment configuration |
| 3 | P1 #4: Sentry integration |
| 4-5 | P1 #5: CI/CD pipelines |

### Week 2: Infrastructure
| Day | Tasks |
|-----|-------|
| 1-2 | P1 #6: Database backups |
| 3-4 | P1 #7: Staging environment |
| 5 | Testing & verification |

### Week 3-4: Quality
| Day | Tasks |
|-----|-------|
| 1-5 | P2 #8: Testing coverage |
| 6-8 | P2 #9: Mobile polish |
| 9-10 | P2 #10: Console features |

### Post-Launch
- P2 #11: Performance optimization
- P3 items as time permits

---

## Checklist Summary

### Before Soft Launch (Alpha)
- [ ] All P0 items complete
- [ ] P1 #4 (Error monitoring) complete
- [ ] Basic CI/CD running
- [ ] Staging environment working

### Before Public Launch (Beta)
- [ ] All P1 items complete
- [ ] 40% test coverage achieved
- [ ] Performance benchmarks established
- [ ] Runbook documented

### Before General Availability
- [ ] All P2 items complete
- [ ] 60% test coverage achieved
- [ ] Security audit completed
- [ ] Load testing completed

---

## Resource Requirements

| Role | Hours Needed | Timeline |
|------|--------------|----------|
| Backend Engineer | 40-50 hrs | Weeks 1-3 |
| Mobile Engineer | 30-40 hrs | Weeks 2-4 |
| Frontend Engineer | 20-30 hrs | Weeks 2-4 |
| DevOps | 15-20 hrs | Weeks 1-2 |
| QA | 20-30 hrs | Weeks 3-4 |

**Total Estimated Effort:** 125-170 engineering hours

---

## Appendix: Quick Wins (< 1 hour each)

1. ✅ Add Stripe key to Brain `.env` - DONE
2. ✅ Deploy updated Firestore rules - DONE
3. ✅ Remove real API key from console `.env.example` - DONE
4. ✅ Add `.env.example` to mobile - DONE
5. [ ] Enable Firestore backups in Firebase Console
6. [ ] Add `robots.txt` to console public folder
7. ✅ Add security headers to Brain (CORS, CSP) - DONE
8. ✅ Update default JWT secret in Brain config - DONE (validation added)
9. ✅ Add production config validation - DONE
10. ✅ Add global exception handler - DONE
11. ✅ Add API key middleware - DONE
12. ✅ Add BRAIN_API_KEY to `.env` - DONE
13. ✅ Create Mobile CI workflow - DONE
14. ✅ Create Console CI/CD workflow - DONE
15. ✅ Update Brain CI with tests & security scan - DONE
16. ✅ Add Sentry integration to Brain - DONE
17. ✅ Add Sentry integration to Mobile - DONE
