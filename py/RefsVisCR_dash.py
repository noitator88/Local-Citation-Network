# for dash
import dash
import dash_table
import pandas as pd
# for crossref web access
import json
import urllib.request
from urllib.error import HTTPError
from urllib.parse import quote_plus, urlencode
from urllib.request import CacheFTPHandler, urlopen, Request
from Levenshtein import ratio, matching_blocks, editops
# for crossrefapi
from crossref.restful import Works
works = Works()


def crossref_query_title(title):
    """Fetch the doi via the title
    """
    EMPTY_RESULT = {
        "crossref_title": "",
        "similarity": 0,
        "doi": ""
    }
    api_url = "https://api.crossref.org/works?"
    params = {"rows": "5", "query.bibliographic": title}
    url = api_url + urlencode(params, quote_via=quote_plus)
    # print(url)
    request = Request(url)
    request.add_header(
        "User-Agent", "DOI Importer; mailto:example@gmail.com")
    try:
        ret = urlopen(request)
        content = ret.read()
        data = json.loads(content)
        items = data["message"]["items"]
        most_similar = EMPTY_RESULT
        for item in items:
            if "title" not in item:
                continue
            title = item["title"].pop()
            result = {
                "crossref_title": title,
                "similarity": ratio(title.lower(), params["query.bibliographic"].lower()),
                "doi": item["DOI"]
            }
            if most_similar["similarity"] < result["similarity"]:
                most_similar = result
        return {"success": True, "result": most_similar}
    except HTTPError as httpe:
        return {"success": False, "result": EMPTY_RESULT, "exception": httpe}


def doi_info(doi):
    """Fetch the paper information via the doi
    """
    w1 = works.doi(doi)
    w1_cnt = w1['reference-count']
    w1_title = w1['title'][0]
    w1_year = w1['created']['date-parts'][0][0]
    w1_journal = w1['container-title'][0]
    w1_1au = w1['author'][0]['given'] + " " + w1['author'][0]['family']
    ref_lst = []
    for iw in range(w1_cnt):
        try:
            ref_lst.append(w1['reference'][iw]['DOI'].upper())
        except:
            print("No DOI found for the reference:")
            print(w1['reference'][iw])

    return w1_title, w1_year, w1_journal, w1_1au, ref_lst


def doi_bib_dx(doi):
    """Get bibtex via doi, see https://scipython.com/blog/doi-to-bibtex/ for details
    """
    BASE_URL = 'http://dx.doi.org/'
    url = BASE_URL + doi
    req = urllib.request.Request(url)
    # can give a better formatted bibtex
    req.add_header('Accept', 'application/x-bibtex')
    #req.add_header('Accept', 'text/bibliography; style=bibtex')
    try:
        with urllib.request.urlopen(req) as f:
            bibtex = f.read().decode()
        return bibtex
    except HTTPError as e:
        if e.code == 404:
            return 'DOI not found.'
        else:
            return 'Service unavailable.'


# create a dataframe for the paper
papel = pd.DataFrame(columns=['Title', 'Author_1st', 'Journal', 'Year', 'DOI'])

# fill some data
recv = crossref_query_title(
    "An On-Demand Coherent Single-Electron Source")  # fetch doi from title
# format the doi to upper case
formattedDOI = recv['result']['doi'].upper()
Ref_title, Ref_year, Ref_journal, Ref_1au, Ref_dois = doi_info(
    formattedDOI)                                # get the refs for the doi
papel = papel.append({'Title': Ref_title, 'Author_1st': Ref_1au, 'Journal': Ref_journal,
                     'Year': Ref_year, 'DOI': formattedDOI}, ignore_index=True)

formattedDOI = '10.1103/PHYSREVLETT.72.210'.upper()
Ref_title, Ref_year, Ref_journal, Ref_1au, Ref_dois = doi_info(formattedDOI)
papel = papel.append({'Title': Ref_title, 'Author_1st': Ref_1au, 'Journal': Ref_journal,
                     'Year': Ref_year, 'DOI': formattedDOI}, ignore_index=True)

formattedDOI = '10.1103/PHYSREVB.46.12485'.upper()
if papel.query(' DOI == @formattedDOI ').empty:
    Ref_title, Ref_year, Ref_journal, Ref_1au, Ref_dois = doi_info(
        formattedDOI)
    papel = papel.append({'Title': Ref_title, 'Author_1st': Ref_1au, 'Journal': Ref_journal,
                         'Year': Ref_year, 'DOI': formattedDOI}, ignore_index=True)


# df = pd.read_csv(
#     'https://raw.githubusercontent.com/plotly/datasets/master/solar.csv')

app = dash.Dash(__name__)

app.layout = dash_table.DataTable(
    id='table',
    columns=[{"name": i, "id": i} for i in papel.columns],
    data=papel.to_dict('records'),
)

if __name__ == '__main__':
    app.run_server(debug=True)
