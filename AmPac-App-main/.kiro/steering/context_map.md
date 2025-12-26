# Steering Document Map

This directory contains the "Source of Truth" for the AmPac project. AI Agents and Developers should reference these files for context.

| File                                               | Purpose                                                                         |
| :------------------------------------------------- | :------------------------------------------------------------------------------ |
| **[product.md](product.md)**                       | Product vision, features, target users, and M365 integration goals.             |
| **[tech.md](tech.md)**                             | Technology stack, libraries, and approved tools (Azure, React Native, FastAPI). |
| **[structure.md](structure.md)**                   | Monorepo layout, source organization, and naming conventions.                   |
| **[technical_analysis.md](technical_analysis.md)** | Deep-dive audit of current state, risks, and missing features.                  |
| **[../ECOSYSTEM_SPEC.md](../ECOSYSTEM_SPEC.md)**   | High-level ecosystem architecture spec.                                         |

## Quick Context Rules

1. **Azure First**: All new infrastructure uses Azure (Container Apps, SWA, Entra ID).
2. **Security**: No client-side secrets. Use Key Vault.
3. **Mobile**: Offline-first architecture with Firestore sync.
4. **Brain**: Python/FastAPI service for all AI/LLM logic.
