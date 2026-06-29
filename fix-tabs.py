
path = 'D:/erm-app/src/app/(app)/manajemen-risiko/penetapan-konteks/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '''        {tabs.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} pt="md">
            <CrudTable resource={tab.value} />
          </Tabs.Panel>
        ))}'''
new = '''        {tabs.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} pt="md">
            {activeTab === tab.value && <CrudTable resource={tab.value} />}
          </Tabs.Panel>
        ))}'''
assert old in c, "panels block not found"
c = c.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print("SUCCESS: Only active tab's CrudTable will render/fetch")
