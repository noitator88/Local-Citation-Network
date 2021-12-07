/* Local Citation Network v0.96 (GPL-3) */
/* by Tim Wölfle */
/* https://timwoelfle.github.io/Local-Citation-Network */

/* global fetch, localStorage, vis, Vue, Buefy */

'use strict'

const arrSum = arr => arr.reduce((a, b) => a + b, 0)
const arrAvg = arr => arrSum(arr) / arr.length

/* Crossref API */

function crossrefWorks (expression, responseFunction, count) {
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

function crossrefResponseToArticleArray (data, sourceReferences) {
  return data.message.items.map(function (article) {
    // filter is necessary because some references don't have DOIs in Crossref (https://stackoverflow.com/questions/28607451/removing-undefined-values-from-array)
    const references = (typeof article.reference === 'object') ? article.reference.map(x => (x.DOI) ? x.DOI.toUpperCase() : undefined) : []

    return {
      id: article.DOI.toUpperCase(),
      // Crossref actually returns references in the original order (as opposed to MA & OC)
      numberInSourceReferences: (sourceReferences.length) ? (sourceReferences.indexOf(article.DOI.toUpperCase()) + 1) : undefined,
      doi: article.DOI.toUpperCase(),
      title: String(article.title), // most of the time title is an array with length=1, but I've also seen pure strings
      authors: (article.author && article.author.length) ? article.author.map(x => ({ LN: x.family || x.name, FN: x.given, affil: String(x.affiliation) || undefined })) : [{ LN: article.author || undefined }],
      year: article.issued['date-parts'] && article.issued['date-parts'][0] && article.issued['date-parts'][0][0],
      journal: String(article['container-title']),
      references: references || [], // Crossref "references" array contains null positions for references it doesn't have DOIs for, thus preserving the original number of references
      citationsCount: article['is-referenced-by-count'],
      abstract: article.abstract
    }
  })
}

/* OpenCitations API */

function openCitationsMetadata (expression, responseFunction, count) {
  // https://opencitations.net/index/api/v1#/metadata/{dois}
  return fetch('https://opencitations.net/index/api/v1/metadata/' + expression).then(response => {
    if (!response.ok) {
      throw new Error(response)
    }
    return response.json()
  }).then(data => {
    responseFunction(data)
  }).catch(error => {
    vm.errorMessage('Error while processing data through OpenCitations API: ' + error)
  })
}

function openCitationsResponseToArticleArray (data, sourceReferences) {
  return data.map(function (article) {
    const references = (article.reference) ? article.reference.split('; ').map(x => x.toUpperCase()) : []

    return {
      id: article.doi.toUpperCase(),
      // OpenCitations doesn't seem to return references in original ordering
      // Nonetheless, when the input is a listOfDOIs (i.e. file / bookmarklet), the order can be recovered
      numberInSourceReferences: (sourceReferences.length) ? sourceReferences.indexOf(article.doi.toUpperCase()) + 1 : undefined,
      doi: article.doi.toUpperCase(),
      title: String(article.title), // most of the time title is an array with length=1, but I've also seen pure strings
      authors: article.author.split('; ').map(x => ({ LN: x.split(', ')[0], FN: x.split(', ')[1] })),
      year: article.year,
      journal: String(article.source_title),
      references: references,
      citations: (article.citation) ? article.citation.split('; ').map(x => x.toUpperCase()) : [],
      citationsCount: Number(article.citation_count)
    }
  })
}

/* Microsoft Academic (MA) API  */

function microsoftAcademicEvaluate (expression, responseFunction, count, apiKey = '') {
  const body = {
    expr: expression,
    model: 'latest',
    count: count,
    offset: 0,
    attributes: ['Id', 'DOI', 'DN', 'AA.DAuN', 'AA.DAfN', 'Y', 'BV', 'RId', 'ECC', 'CitCon', 'IA'].join(',')
  }

  const init = {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    // Encode request body as URLencoded
    body: Object.keys(body).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(body[k])
    }).join('&')
  }

  return fetch('https://api.labs.cognitive.microsoft.com/academic/v1.0/evaluate', init).then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        vm.API = 'Crossref'
        let errorMessage = 'Try again with Crossref, Microsoft Academic turned off.<br><br>'
        if (vm.customKeyMA) {
          errorMessage += 'Custom API key for Microsoft Academic (' + vm.customKeyMA + ') incorrect or monthly quota exhausted.'
        } else {
          errorMessage += 'Test API key used by web app has exceeded monthly quota.'
        }
        errorMessage += ' <a href="https://msr-apis.portal.azure-api.net/products/project-academic-knowledge" target="_blank">Get your own free key here!</a> Try again with Crossref or OpenCitations, Microsoft Academic turned off.'
        vm.customKeyMA = undefined
        throw new Error(errorMessage)
      }
      throw new Error(response)
    }
    return response.json()
  }).then(data => {
    responseFunction(data)
  }).catch(error =>
    vm.errorMessage('Error while processing data through Microsoft Academic API: ' + error)
  )
}

// API attributes documentation: https://docs.microsoft.com/en-us/azure/cognitive-services/academic-knowledge/paperentityattributes
function microsoftAcademicResponseToArticleArray (data, sourceReferences) {
  return data.entities.map(function (article) {
    return {
      id: article.Id,
      microsoftAcademicId: article.Id,
      // Microsoft Academic returns reference lists of papers as arrays sorted by "relevance" (close to global number of citations), not by order of references in original publication
      // Nonetheless, when the input is a listOfDOIs (i.e. file / bookmarklet), the order can be recovered
      numberInSourceReferences: (article.DOI) ? ((sourceReferences.length) ? sourceReferences.indexOf(article.DOI.toUpperCase()) + 1 : undefined) : undefined,
      doi: (article.DOI) ? article.DOI.toUpperCase() : undefined, // some articles don't have DOIs
      title: article.DN,
      authors: article.AA.map(author => {
        if (!author.DAuN) return { LN: String(author) }
        const lastSpace = author.DAuN.lastIndexOf(' ')
        // Unfortunately, Microsoft Academic often has multiple author Ids for the same author name when affiliations differ => this leads to seeming redundancies
        return { LN: author.DAuN.substr(lastSpace + 1), FN: author.DAuN.substr(0, lastSpace), affil: author.DAfN || undefined }
      }),
      year: article.Y,
      journal: article.BV,
      references: article.RId || [],
      citationsCount: article.ECC,
      citationContext: article.CitCon,
      abstract: (article.IA) ? revertAbstractFromInvertedIndex(article.IA.InvertedIndex) : undefined
    }
  })
}

function revertAbstractFromInvertedIndex (InvertedIndex) {
  const abstract = []
  Object.keys(InvertedIndex).forEach(word => InvertedIndex[word].forEach(i => { abstract[i] = word }))
  return abstract.join(' ').replace('  ', ' ').trim()
}

/* vis.js Reference graph */

// I've tried keeping citationNetwork in Vue's data, but it slowed things down a lot -- better keep it as global variable as network is not rendered through Vue anyway
let citationNetwork, authorNetwork

function initCitationNetwork (app) {
  // This line is necessary because of v-if="currentGraphIndex !== undefined" in the main columns div, which apparently is evaluated after watch:currentGraphIndex is called
  if (!document.getElementById('citationNetwork')) return setTimeout(function () { app.init() }, 1)

  // Create an array with nodes only for nodes with in- / out-degree >= 1 (no singletons)
  const articles = app.currentGraph.input.filter(article => app.inDegree(article.id) || app.outDegree(article.id)).concat(app.incomingSuggestionsSliced).concat(app.outgoingSuggestionsSliced)
  const articlesIds = articles.map(article => article.id)

  // Create an array with edges
  const edges = articles.map(function (article) {
    return (!article.references) ? [] : article.references.map(function (ref) {
      if (articlesIds.includes(ref)) {
        return { from: article.id, to: ref }
      } else {
        return []
      }
    })
  }).flat(2)

  // Sort by rank of year
  const years = Array.from(new Set(articles.map(article => article.year).sort()))

  const nodes = articles.map(article => ({
    id: article.id,
    title: app.authorStringShort(article.authors) + '. ' + article.title + '. ' + article.journal + '. ' + article.year + '.',
    level: years.indexOf(article.year),
    group: article.year,
    size: arrSum([5, app.inDegree(article.id), app.outDegree(article.id)]) * 5,
    shape: (app.currentGraph.source.id === article.id) ? 'diamond' : (app.inputArticlesIds.includes(article.id) ? 'dot' : (app.incomingSuggestionsIds.includes(article.id) ? 'triangle' : 'triangleDown')),
    label: article.authors[0].LN + '\n' + article.year
  }))

  // Create network
  const options = {
    layout: {
      hierarchical: {
        direction: 'DU',
        levelSeparation: 400
      }
    },
    nodes: {
      font: {
        size: 150
      }
    },
    edges: {
      color: {
        color: 'rgba(200,200,200,0.3)',
        highlight: 'rgba(0,0,0,0.3)'
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 4
        }
      },
      width: 5
      // chosen: { edge: function(values, id, selected, hovering) { values.inheritsColor = "from" } },
    },
    interaction: {
      selectConnectedEdges: true
    },
    physics: {
      hierarchicalRepulsion: {
        nodeDistance: 600
      }
    },
    configure: false
  }
  citationNetwork = new vis.Network(document.getElementById('citationNetwork'), { nodes: nodes, edges: edges }, options)
  citationNetwork.on('click', networkOnClick)
  citationNetwork.on('doubleClick', networkOnDoubleClick)
  citationNetwork.on('resize', function () { citationNetwork.fit() })

  function networkOnClick (params) {
    let selectedNode

    // Select corresponding row in table
    if (params.nodes.length > 0) {
      selectedNode = params.nodes[0]
      // Input article node was clicked (circle)
      if (app.inputArticlesIds.includes(selectedNode)) {
        app.showArticlesTab = 'inputArticles'
        app.selectedInputArticle = app.currentGraph.input[app.inputArticlesIds.indexOf(selectedNode)]
        // Suggested article node was clicked (triangle)
      } else if (app.incomingSuggestionsIds.includes(selectedNode)) {
        app.showArticlesTab = 'incomingSuggestions'
        app.selectedIncomingSuggestionsArticle = app.currentGraph.incomingSuggestions[app.incomingSuggestionsIds.indexOf(selectedNode)]
      } else {
        app.showArticlesTab = 'outgoingSuggestions'
        app.selectedOutgoingSuggestionsArticle = app.currentGraph.outgoingSuggestions[app.outgoingSuggestionsIds.indexOf(selectedNode)]
      }
    }
  }

  function networkOnDoubleClick (params) {
    let selectedNode, article

    // Select corresponding row in table
    if (params.nodes.length > 0) {
      selectedNode = params.nodes[0]
      article = app.currentGraph.input[app.inputArticlesIds.indexOf(selectedNode)] || app.currentGraph.incomingSuggestions[app.incomingSuggestionsIds.indexOf(selectedNode)]
      window.open('https://doi.org/' + article.doi, '_blank')
    }
  }
}

function initAuthorNetwork (app, minPublications = undefined) {
  if (!document.getElementById('authorNetwork')) return false

  // Unfortunately, Microsoft Academic often has multiple author Ids for the same author name when affiliations differ => this leads to seeming redundancies, which makes the new Set() necessary to have each author name be unique
  // (I know this can cause trouble with non-unique author names actually shared by two people publishing in similar fields but I'm currently not taking this into account)
  let authorGroups = app.currentGraph.input.concat(app.incomingSuggestionsSliced).concat(app.outgoingSuggestionsSliced).map(article => article.authors ? Array.from(new Set(article.authors.map(x => x.FN + ' ' + x.LN))) : [])
  const authors = {}
  let authorsWithMinPubs = []
  const links = {}

  // Get authors from more than one publication
  authorGroups.flat().forEach(author => { authors[author] = (authors[author] || 0) + 1 })

  if (!minPublications) {
    minPublications = 2
    authorsWithMinPubs = Object.keys(authors).filter(author => authors[author] >= minPublications)
    while (authorsWithMinPubs.length > 50) {
      minPublications++
      authorsWithMinPubs = Object.keys(authors).filter(author => authors[author] >= minPublications)
    }
    app.minPublications = minPublications
  } else {
    authorsWithMinPubs = Object.keys(authors).filter(author => authors[author] >= minPublications)
  }

  authorGroups = authorGroups.map(group => group.filter(author => authorsWithMinPubs.includes(author)))

  authorGroups.forEach(group => group.forEach(indiv1 => group.forEach(indiv2 => {
    if (indiv1 === indiv2) return false

    // Is there already a link for this pair? If so, make it stronger
    if (links[indiv1] && links[indiv1][indiv2]) return links[indiv1][indiv2]++
    if (links[indiv2] && links[indiv2][indiv1]) return links[indiv2][indiv1]++

    // Create new link
    if (!links[indiv1]) links[indiv1] = {}
    links[indiv1][indiv2] = 1
  })))

  const edges = Object.keys(links).map(indiv1 => Object.keys(links[indiv1]).map(indiv2 => {
    return { from: indiv1, to: indiv2, value: links[indiv1][indiv2], title: indiv1 + ' & ' + indiv2 + ' (' + links[indiv1][indiv2] / 2 + ' collaboration(s) among source, input & suggested articles)' }
  })).flat(2)

  const nodes = authorsWithMinPubs.map(author => {
    return {
      id: author,
      title: author + ((app.authorString(app.currentGraph.source.authors).includes(author)) ? ' ((co)author of source article) (' : ' (') + authors[author] + ' publication(s) among input & suggested articles)',
      group: authorGroups.map(group => group.includes(author)).indexOf(true),
      label: author.substr(author.lastIndexOf(' ') + 1),
      size: authors[author] * 3,
      shape: (app.authorString(app.currentGraph.source.authors).includes(author)) ? 'diamond' : 'dot'
    }
  })

  // create a network
  const options = {
    nodes: {
      font: {
        size: 20
      }

    },
    edges: {
      color: {
        color: 'rgba(200,200,200,0.3)'
      },
      smooth: false
    },
    physics: {
      maxVelocity: 20
    },
    interaction: {
      dragNodes: true,
      multiselect: true,
      hideEdgesOnDrag: true,
      hideEdgesOnZoom: true
    },
    configure: false
  }
  authorNetwork = new vis.Network(document.getElementById('authorNetwork'), { nodes: nodes, edges: edges }, options)
  authorNetwork.on('click', networkOnClick)
  authorNetwork.on('resize', function () { authorNetwork.fit() })

  function networkOnClick (params) {
    app.filterColumn = 'authors'

    // If no node is clicked...
    if (!params.nodes.length) {
      // Maybe an edge?
      if (params.edges.length) {
        const edge = authorNetwork.body.data.edges.get(params.edges[0])
        app.highlightNodes([edge.from, edge.to])
        app.filterString = '(?=.*' + edge.from + ')(?=.*' + edge.to + ')'
        return app.filterString
        // Otherwise reset filterString
      } else {
        app.filterString = undefined
        return false
      }
    }

    // If just one node is selected perform simple filter for that author
    if (params.nodes.length === 1) {
      app.filterString = params.nodes[0]
      // If more than one node are selected, perform "boolean and" in regular expression through lookaheads, which means order isn't important (see https://www.ocpsoft.org/tutorials/regular-expressions/and-in-regex/)
    } else {
      app.filterString = '(?=.*' + params.nodes.join(')(?=.*') + ')'
    }

    app.highlightNodes(params.nodes)
  }
}



// debug in devtools@chrome

// read crossrefworks
crossrefWorks('doi:10.1126/science.1141243', data => { console.log(vm.responseToArray(data)[0]) } , 1)
crossrefWorks('doi:10.1126/science.1141243', data => { console.log(crossrefResponseToArticleArray(data, sourceReferences = false)[0]) } , 1)

