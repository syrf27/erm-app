
$content = Get-Content "D:\erm-app\src\app\(app)\manajemen-risiko\penetapan-konteks\crud-table.tsx" -Raw
$content = $content.Replace('import { useState }', 'import { useState, useMemo }')
$content | Out-File -FilePath "D:\erm-app\src\app\(app)\manajemen-risiko\penetapan-konteks\crud-table.tsx" -Encoding UTF8 -NoNewline
