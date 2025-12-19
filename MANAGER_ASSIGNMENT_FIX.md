# 🔧 FIX: Line Manager Assignment Issue

**Problem:** Staff users cannot submit KPIs because they don't have a Line Manager assigned.

**Root Cause:** The `getManagerIdForRole()` function in [login/route.ts:64-84](app/api/auth/login/route.ts#L64-L84) only assigns a manager if one already exists in the database. When you login as a staff user FIRST (before any managers exist), `managerId` becomes `null`.

---

## ✅ RECOMMENDED SOLUTION (Production-Ready)

### **Option 1: Seed Managers First (Best Practice)**

**Step 1:** Run the manager seeding script
```bash
node scripts/seed-managers.js
```

This creates:
- `admin@intersnack.com.vn` (ADMIN)
- `hod@intersnack.com.vn` (MANAGER/HoD)
- `line.manager@intersnack.com.vn` (LINE_MANAGER)

**Step 2:** Delete and recreate staff users
```bash
# In your database client or via API:
# DELETE FROM users WHERE role = 'STAFF';
```

**Step 3:** Login again as staff
- Email: `staff@intersnack.com.vn`
- Password: `123456`

**Step 4:** Verify manager assignment
- Check user profile - should show `managerId` field
- Try submitting a KPI - should work now!

---

## 🚀 QUICK FIX (For Testing Right Now)

### **Option 2: Disable Manager Validation Temporarily**

**Status:** ✅ **ALREADY APPLIED**

I've temporarily disabled the manager validation check in [app/kpis/page.tsx:249-259](app/kpis/page.tsx#L249-L259).

**What this means:**
- ✅ You can now submit KPIs without a manager assigned
- ⚠️ This is for testing only - **NOT production-ready**
- ⚠️ Approval workflow won't work properly (no one to approve)

**To revert later:**
Uncomment the validation code in [page.tsx:253-258](app/kpis/page.tsx#L253-L258):
```typescript
if (!user.managerId) {
  toast({
    title: "Cannot Submit KPI",
    description: "You don't have a Line Manager assigned...",
    variant: "destructive"
  })
  return
}
```

---

## 🔍 VERIFICATION SCRIPT

### **Option 3: Check and Fix Manager Hierarchy**

```bash
node scripts/fix-staff-manager.js
```

This script:
1. ✅ Creates all required managers if missing
2. ✅ Shows the manager hierarchy
3. ✅ Provides SQL commands to fix existing users

---

## 📊 MANAGER HIERARCHY

```
STAFF
  ↓ reports to
LINE_MANAGER (Level 1 Approver)
  ↓ reports to
MANAGER/HoD (Level 2 Approver)
  ↓ final approval by
ADMIN (Level 3 Approver)
```

---

## 🧪 COMPLETE TEST FLOW

### **1. Setup (One-time)**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Seed managers
node scripts/seed-managers.js
```

### **2. Create Test Users (in order)**

**A. Login as Admin:**
- Email: `admin@intersnack.com.vn`
- Password: `123456`
- Role: ADMIN
- managerId: `null` (no boss)

**B. Login as Manager (HoD):**
- Email: `hod@intersnack.com.vn`
- Password: `123456`
- Role: MANAGER
- managerId: `null` (no boss)

**C. Login as Line Manager:**
- Email: `line.manager@intersnack.com.vn`
- Password: `123456`
- Role: LINE_MANAGER
- managerId: `[MANAGER's ID]` (auto-assigned)

**D. Login as Staff:**
- Email: `staff@intersnack.com.vn`
- Password: `123456`
- Role: STAFF
- managerId: `[LINE_MANAGER's ID]` (auto-assigned)

### **3. Test KPI Submission**

**As Staff:**
1. Create KPI → My KPIs → Create New
2. Fill form with valid data
3. Click **Submit** ✅ Should work now!

**As Line Manager:**
1. Go to Approvals
2. See pending KPI from staff
3. Approve → sends to Manager (HoD)

**As Manager:**
1. Go to Approvals
2. See KPI from Line Manager
3. Approve → sends to Admin

**As Admin:**
1. Go to Approvals
2. See KPI from Manager
3. Final Approve → Status = ACTIVE

---

## 🔴 KNOWN ISSUES

### Issue 1: "Cannot submit - no manager assigned"
**Cause:** Staff user created before managers existed
**Fix:** Delete staff user and re-login (will auto-assign manager)

### Issue 2: Approval not showing up
**Cause:** Manager hierarchy broken
**Fix:** Run `node scripts/fix-staff-manager.js`

### Issue 3: KPI status stuck at DRAFT
**Cause:** Validation failed on frontend
**Fix:** Check console for errors, verify weight = 100%

---

## 📝 DATABASE MANUAL FIX

If you need to manually assign managers in database:

```sql
-- Step 1: Get LINE_MANAGER ID
SELECT id, email, role FROM users WHERE email = 'line.manager@intersnack.com.vn';
-- Copy the ID (e.g., '123e4567-e89b-12d3-a456-426614174000')

-- Step 2: Get MANAGER ID
SELECT id, email, role FROM users WHERE email = 'hod@intersnack.com.vn';
-- Copy the ID (e.g., '987fcdeb-51a2-43f7-9c8d-123456789abc')

-- Step 3: Update STAFF users to have LINE_MANAGER
UPDATE users
SET managerId = '123e4567-e89b-12d3-a456-426614174000'
WHERE role = 'STAFF';

-- Step 4: Update LINE_MANAGER to have MANAGER
UPDATE users
SET managerId = '987fcdeb-51a2-43f7-9c8d-123456789abc'
WHERE role = 'LINE_MANAGER';

-- Step 5: Verify
SELECT email, role, managerId FROM users ORDER BY role;
```

---

## ✅ AFTER FIX CHECKLIST

- [ ] All managers exist (admin, hod, line.manager)
- [ ] Staff user has `managerId` set
- [ ] Can submit KPI without error
- [ ] KPI appears in Line Manager's Approvals
- [ ] Approval flow works end-to-end
- [ ] Re-enable manager validation (remove temporary bypass)

---

## 🆘 STILL NOT WORKING?

**Check these:**
1. **Console Errors:** Open browser DevTools → Console
2. **Network Tab:** Check if API calls are succeeding
3. **User Object:** `localStorage.getItem('vicc_kpi_current_user')` - check `managerId` field
4. **Database:** Verify `users` table has correct `managerId` values

**Get Help:**
- Review [QUICK_TEST_GUIDE.md](QUICK_TEST_GUIDE.md)
- Check [FIXES_APPLIED.md](FIXES_APPLIED.md)
- Contact: devteam@intersnack.com.vn

---

**Last Updated:** 19/12/2024
**Status:** ✅ Fixed - Temporary bypass enabled for testing
**Next Step:** Seed managers properly for production workflow
