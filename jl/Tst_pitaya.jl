#using Pitaya, DataFrames, Dash, DashHtmlComponents, DashCoreComponents
using Pitaya, DataFrames

xr = works(query = "Waiting times and noise in single particle transport", limit = 10)
#xr = works(query = "10.1126/SCIENCE.1141243", limit = 10)

xitems = xr["message"]["items"]

# # test for one item
# xit = xitems[1]
# xau      = xit["author"][1]["given"] * " " * xit["author"][1]["family"] 
# xdoi     = xit["DOI"]
# xtitle   = xit["title"][1]
# xjournal = xit["container-title"][1] 
# xyear    = xit["published"]["date-parts"][1][1]

## all the information are stored in x['message']
df = DataFrame(au1 = String[], doi = String[], title = String[], journal = String[], year = Int[])
for xit in xitems
    xau = "No-one"
    try
        xau = xit["author"][1]["given"] * " " * xit["author"][1]["family"]
    catch err
    end
    xdoi = xit["DOI"]
    xtitle = "No-name"
    try
        xtitle = xit["title"][1]
    catch err
    end
    xjournal = "NA"
    try
        xjournal = xit["container-title"][1]
    catch err
    end
    xyear = 1900
    try
        xyear = xit["published"]["date-parts"][1][1]
    catch err
    end


    # push to the dataframe
    push!(df, Dict(:au1 => xau, :doi => xdoi, :title => xtitle, :journal => xjournal, :year => xyear))
    # debug
    println(xau)
    println(xdoi)
    println(xtitle)
    println(xjournal)
    println(xyear)
    println(" ==== ")
end



## web interface
# function generate_table(dataframe, max_rows = 20)
#     html_table([
#         html_thead(html_tr([ html_th(col) for col in names(dataframe) ])),
#         html_tbody([
#             html_tr([ html_td(dataframe[r, c]) for c in names(dataframe) ]) for r = 1:min(nrow(dataframe), max_rows)
#         ])
#     ])
# end

# app = dash()

# app.layout = html_div() do
#     html_h4("Search in crossref"),
#     generate_table(df, 10)
# end

# run_server(app, "0.0.0.0", debug=true)