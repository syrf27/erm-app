# Dashboard Heatmap Color Fix

## Issue
The "Tinggi" risk level was not showing any color in the dashboard heatmap.

## Root Cause
The `fmtColor` function in the dashboard was missing the color mapping for **"Jingga"** (Indonesian for orange), which is the color used for the "Tinggi" risk level in the database.

### Color Mappings in Database (from seed file):
- **Biru** → Sangat Rendah (Very Low)
- **Hijau** → Rendah (Low)
- **Kuning** → Sedang (Medium)
- **Jingga** → Tinggi (High) ← **MISSING IN DASHBOARD**
- **Merah** → Sangat Tinggi (Very High)

### Previous Dashboard Mapping:
```javascript
const map: Record<string, string> = {
  merah: "#fa5252", "merah tua": "#c92a2a", 
  oranye: "#fd7e14", orange: "#fd7e14",  // ❌ Only had "oranye" and "orange"
  kuning: "#fab005", 
  hijau: "#40c057", "hijau tua": "#2b8a3e", 
  biru: "#228be6",
};
```

## Solution
Added **"jingga"** to the color mapping function:

```javascript
const map: Record<string, string> = {
  merah: "#fa5252", "merah tua": "#c92a2a", 
  jingga: "#fd7e14", oranye: "#fd7e14", orange: "#fd7e14",  // ✅ Added "jingga"
  kuning: "#fab005", 
  hijau: "#40c057", "hijau tua": "#2b8a3e", 
  biru: "#228be6",
};
```

## Result
✅ The heatmap now correctly displays orange color (#fd7e14) for all cells with "Tinggi" risk level  
✅ The legend at the bottom of the heatmap shows orange color for "Tinggi"  
✅ TypeScript compilation: PASSED (no errors)  
✅ Production build: PASSED (exit code 0)

## Files Modified
- `src/app/(app)/page.tsx` - Updated `fmtColor` function

---
**Fix Date**: Kamis, 25 Juni 2026
**Status**: ✅ **FIXED & VERIFIED**
