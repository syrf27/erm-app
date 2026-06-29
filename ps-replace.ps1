
(Get-Content "D:\erm-app\src\app\(app)\manajemen-risiko\penetapan-konteks\crud-table.tsx") -replace 'import \{ useState \} from "react";', '' | Set-Content "D:\erm-app\src\app\(app)\manajemen-risiko\penetapan-konteks\crud-table-temp.tsx"
Move-Item -Force "D:\erm-app\src\app\(app)\manajemen-risiko\penetapan-konteks\crud-table-temp.tsx" "D:\erm-app\src\app\(app)\manajemen-risiko\penetapan-konteks\crud-table.tsx"
