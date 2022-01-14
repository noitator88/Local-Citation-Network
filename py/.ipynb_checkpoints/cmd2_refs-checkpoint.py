#!/usr/bin/env python3

import cmd2
from cmd2 import Cmd
import json
from urllib.error import HTTPError
from urllib.parse import quote_plus, urlencode
from urllib.request import CacheFTPHandler, urlopen, Request
from Levenshtein import ratio, matching_blocks, editops
from crossref.restful import Works
works = Works()

EMPTY_RESULT = {
    "crossref_title": "",
    "similarity": 0,
    "doi": ""
}


def crossref_query_title(title):
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
    time.sleep(1)


class REPL(Cmd):
    prompt = "CR> "
    intro = "Welcome to the Reference Manager with Crossref Toolkits"

    def __init__(self):
        Cmd.__init__(self)

    def do_title2doi(self, title):
        recv_dict = crossref_query_title(title)
        recv_title = recv_dict["result"]["crossref_title"]
        recv_doi = recv_dict["result"]["doi"]
        print(recv_title, "  ", recv_doi, file=self.stdout)
        # self.poutput(recv_doi)

    def do_doi_refs(self, doi):
        w1 = works.doi(doi)
        w1_cnt = w1['reference-count']
        ref_lst = []
        for iw in range(w1_cnt):
            try:
                ref_lst.append(w1['reference'][iw]['DOI'])
            except:
                print("No DOI found for the reference:")
                print(w1['reference'][iw])

        print(ref_lst)

    def do_

if __name__ == '__main__':
    app = REPL()
    app.cmdloop()
