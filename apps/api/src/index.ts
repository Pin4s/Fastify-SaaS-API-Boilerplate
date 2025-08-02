import { defineAbilityFor } from "@saas/auth"

const ability = defineAbilityFor({ role: 'MEMBER', id: 'user-id' });

console.log(ability.can('get', 'User')); // true