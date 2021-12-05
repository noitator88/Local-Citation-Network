// console.log("Hello!\n");

/* Crossref API */


function crossrefWorks(expression, responseFunction, count) {
  // Currently the crossref API doesn't fully support subselection of response, so just obtain full response (in particular reference data: https://gitlab.com/crossref/issues/issues/511)
  let body = {
    filter: expression,
    rows: count,
    offset: 0,
    mailto: 'local-citation-network@timwoelfle.de'
  }

  // Encode request body as URLencoded
  body = Object.keys(body).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(body[k])
  }).join('&')

  return fetch('https://api.crossref.org/works?' + body).then(response => {
    return response.json()
  }).then(data => {
    if (data.status === 'failed') {
      throw new Error(data.message && data.message[0] && data.message[0].message)
    }
    responseFunction(data)
  }).catch(error =>
    vm.errorMessage('Error while processing data through Crossref API: ' + error)
  )
}

// function crossrefResponseToArticleArray(data, sourceReferences) {
//   return data.message.items.map(function (article) {
//     // filter is necessary because some references don't have DOIs in Crossref (https://stackoverflow.com/questions/28607451/removing-undefined-values-from-array)
//     const references = (typeof article.reference === 'object') ? article.reference.map(x => (x.DOI) ? x.DOI.toUpperCase() : undefined) : []

//     return {
//       id: article.DOI.toUpperCase(),
//       // Crossref actually returns references in the original order (as opposed to MA & OC)
//       numberInSourceReferences: (sourceReferences.length) ? (sourceReferences.indexOf(article.DOI.toUpperCase()) + 1) : undefined,
//       doi: article.DOI.toUpperCase(),
//       title: String(article.title), // most of the time title is an array with length=1, but I've also seen pure strings
//       authors: (article.author && article.author.length) ? article.author.map(x => ({ LN: x.family || x.name, FN: x.given, affil: String(x.affiliation) || undefined })) : [{ LN: article.author || undefined }],
//       year: article.issued['date-parts'] && article.issued['date-parts'][0] && article.issued['date-parts'][0][0],
//       journal: String(article['container-title']),
//       references: references || [], // Crossref "references" array contains null positions for references it doesn't have DOIs for, thus preserving the original number of references
//       citationsCount: article['is-referenced-by-count'],
//       abstract: article.abstract
//     }
//   })
// }

function setNewSource(source, label = undefined, title = undefined) {
  try {
    // Some papers are in Crossref / MA but don't have references themselves
    if (!source) throw new Error(`DOI ${this.newSourceDOI} not found in ${this.API} API, try other API.`)
    if (!source.references.length) throw new Error(`No references found in ${this.API} API for paper: ${this.newSourceDOI}`)

    // Get Input articles
    // filter(Boolean) is necessary because references array can contain empty items in order to preserve original order of DOIs from crossref
    this.callAPI(source.references.filter(Boolean), data => {
      const referencedBy = {}
      const citing = {}
      // Only send sourceReferences to responseToArray function when original numbering can be recovered (either for Crossref or listOfDOIs (i.e. file / bookmarklet))
      let inputArticles = this.responseToArray(data, (this.API === 'Crossref' || !source.id) ? source.references : false)
      // Don't put source in inputArticles (and thus network) when a list was loaded
      if (source.id) inputArticles = inputArticles.concat(source)
      const inputArticlesIds = inputArticles.map(article => article.id)

      function addToCiting(outId, inId) {
        if (inputArticlesIds.includes(inId)) {
          if (!citing[outId]) citing[outId] = []
          if (!citing[outId].includes(inId)) citing[outId].push(inId)
        }
      }

      inputArticles.forEach(article => {
        article.references.filter(Boolean).forEach(refId => {
          if (!referencedBy[refId]) referencedBy[refId] = []
          referencedBy[refId].push(article.id)

          addToCiting(article.id, refId)
        })
        // Currently, only OpenCitations has data on incoming citations
        if (vm.API === 'OpenCitations') {
          article.citations.filter(Boolean).forEach(citId => {
            addToCiting(citId, article.id)
          })
        }
      })

      source.isSource = true

      // Add new tab
      this.graphs.push({
        source: source,
        input: inputArticles,
        incomingSuggestions: [],
        outgoingSuggestions: [],
        referenced: referencedBy,
        citing: citing,
        tabLabel: label || source.authors[0].LN + ' ' + source.year,
        tabTitle: title || source.title,
        API: this.API,
        timestamp: Date.now()
      })

      // Don't keep more articles in tab-bar than maxTabs
      if (this.graphs.length > this.maxTabs) this.graphs = this.graphs.slice(1)

      // Let user explore input articles while incoming suggestions (and outgoing suggestions) are still loading
      this.currentGraphIndex = this.graphs.length - 1
      this.isLoading = false

      /* Find incoming suggestions articles */
      // sort articles by number of local citations (inDegree) and pick max top 20
      // https://medium.com/@alleto.saburido/set-theory-for-arrays-in-es6-eb2f20a61848
      const incomingSuggestionsIds = Object.keys(referencedBy)
        // Only suggest articles that have at least two local citations and that aren't already among input articles
        // Careful with comparing DOIs!!! They have to be all upper case (performed by crossrefResponseToArticleArray & microsoftAcademicResponseToArticleArray)
        .filter(x => referencedBy[x].length > 1 && !inputArticlesIds.includes(Number(x) || x)) // If x is numeric (i.e. Id from Microsoft Academic), convert to Number, otherwise keep DOIs from Crossref
        .sort((a, b) => referencedBy[b].length - referencedBy[a].length).slice(0, 20)

      // In case no ids are found
      if (!incomingSuggestionsIds.length) {
        this.saveState()
      } else {
        this.callAPI(incomingSuggestionsIds, data => {
          const incomingSuggestions = this.responseToArray(data)
          // Careful: Array/object item setting can't be picked up by Vue (https://vuejs.org/v2/guide/list.html#Caveats)
          this.$set(this.graphs[this.graphs.length - 1], 'incomingSuggestions', incomingSuggestions)

          // Microsoft Academic don't have incoming citation data, thus this has to be completed so that incoming suggestions have correct out-degrees, which are based on 'citing'
          if (this.API !== 'OpenCitations') {
            incomingSuggestions.forEach(article => {
              article.references.filter(Boolean).forEach(refId => {
                addToCiting(article.id, refId)
              })
            })
            this.$set(this.graphs[this.graphs.length - 1], 'citing', citing)
          }

          this.init()
          this.saveState()
        }, incomingSuggestionsIds.length)
      }

      // Top incoming citations (newer)
      if (this.API === 'OpenCitations') {
        const outgoingSuggestionsIds = Object.keys(citing)
          // If - in theoretical cases, I haven't seen one yet - a top incoming citation is already a top reference, don't include it here again
          .filter(x => citing[x].length > 1 && !inputArticlesIds.includes(Number(x) || x) && !incomingSuggestionsIds.includes(x)) // If x is numeric (i.e. Id from Microsoft Academic), convert to Number, otherwise keep DOIs from Crossref
          .sort((a, b) => citing[b].length - citing[a].length).slice(0, 20)

        if (!outgoingSuggestionsIds.length) {
          this.saveState()
        } else {
          this.callAPI(outgoingSuggestionsIds, data => {
            // Careful: Array/object item setting can't be picked up by Vue (https://vuejs.org/v2/guide/list.html#Caveats)
            this.$set(this.graphs[this.graphs.length - 1], 'outgoingSuggestions', this.responseToArray(data))
            this.init()
            this.saveState()
          }, outgoingSuggestionsIds.length)
        }
      }
    }, source.references.length)
  } catch (e) {
    this.errorMessage(e)
  }
},


// User provided a new DOI for source article
function newSourceDOI(doi) {

  let DOI = doi.trim().toUpperCase()

  // Ignore trailing string (e.g. 'doi:' or 'https://doi.org/')
  if (DOI.match(/10\.\d{4,9}\/\S+/)) {
    DOI = DOI.match(/10\.\d{4,9}\/\S+/)[0]
  } else {
    return this.errorMessage(DOI + ' is not a valid DOI, which must be in the form: 10.prefix/suffix where prefix is 4 or more digits and suffix is a string.', 'Invalid DOI')
  }
    
  // get doi via crossref
  this.callAPI([DOI], data => {
    this.setNewSource(this.responseToArray(data)[0])
  }, 1)

  console.log(DOI)
}

newSourceDOI("10.1126/science.1141243")

// console.log(result)