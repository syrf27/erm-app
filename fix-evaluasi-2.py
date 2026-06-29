
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/evaluasi/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# R5: colHeaders + add nestedHeaders prop
old5 = '''        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
        ]}'''
new5 = '''        colHeaders={[
          "Ident ID",
          "Evaluasi ID",
          "Risiko",
          "Respon Risiko",
          "Prioritas Risiko",
          "Level Kemungkinan",
          "Level Dampak",
          "Level Risiko",
        ]}
        nestedHeaders={[
          [
            { label: "Ident ID", colspan: 1 },
            { label: "Evaluasi ID", colspan: 1 },
            { label: "Risiko", colspan: 1 },
            { label: "Respon Risiko", colspan: 1 },
            { label: "Prioritas Risiko", colspan: 1 },
            { label: "Risiko Residual", colspan: 3 },
          ],
          [
            "Ident ID",
            "Evaluasi ID",
            "",
            "",
            "",
            "Level Kemungkinan",
            "Level Dampak",
            "Level Risiko",
          ],
        ]}'''
assert old5 in c, "R5 fail"
c = c.replace(old5, new5)

# R6: afterChange - add recalc trigger. Find afterChange handler.
# We need to insert recalc call. Look for existing afterChange.
import re
# Add recalc after the afterChange opening. Find 'afterChange'
assert 'afterChange' in c, "no afterChange"

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("R5 done (headers). afterChange present:", 'afterChange' in c)
