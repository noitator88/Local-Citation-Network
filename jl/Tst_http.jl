using HTTP, Cascadia, Gumbo, DataFrames

res = HTTP.request("GET", "https://onlineporn24.com/?s=bondage")

body = String(res.body);
html = parsehtml(body)

qres = eachmatch(sel".ta-blog-post-box", html.root)

x1 = eachmatch(sel".small", qres[1])

txthref = x1[1][1][1]

href = txthref.attributes["href"]
txt = nodeText(txthref)

