const inst = axios.create({ // eslint-disable-line
  baseURL: "https://api.semanticscholar.org/v1/paper",
  timeout: 3000,
  headers: {
    UserAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17"
  }
});

export default {
  data: function () {
    return {
      result: this.phrase,
      cits_cols: [
        {
          field: "id",
          label: "ID",
          width: "40",
          numeric: true
        },
        {
          field: "title",
          label: "Title"
        },
        {
          field: "doi",
          label: "DOI"
        },
        {
          field: "year",
          label: "Year"
        }
      ]
    };
  },
  props: ["phrase"],
  watch: {
    phrase: function (newVal, oldVal) { // eslint-disable-line
      // this.result = newVal;
      if (newVal == "") return "";

      this.result = "diggin...";

      let query_doi = newVal;
      inst
        .get(`/${query_doi}`)
        .then(resp => {
          this.result = resp.data;
        })
        .catch(err => {
          this.result = err.response;
        });
    }
  },
  computed: {
    resultAlt: function () {
      return this.phrase + (this.phrase ? ":" : "");
    },
    sciHubDOI: function () {
      return "https://sci-hub.se/" + this.result.doi;
    },
    abstract: function () {
      return this.result.abstract;
    },
    title: function () {
      return this.result.title;
    },
    journal: function () {
      return this.result.venue;
    },
    year: function () {
      return this.result.year;
    },
    numCitedBy: function () {
      return this.result.numCitedBy;
    },
    numCiting: function () {
      return this.result.numCiting;
    },
    cits_data: function () {
      // return this.result.citations;
      var citations = this.result.citations;
      var cc = [];
      var i = 0;
      for (const item of citations) {
        ++i;
        cc.push({ "id": i, "title": item.title, "doi": item.doi, "year": item.year });
        console.log(item.year);
        console.log(item.title);
        console.log(item.doi);
      };
      return cc;
    }
  },
  template: `
  <div>
  <!--{{ phrase }}- --> {{ resultAlt }} <br/>
  <b>Title</b>
  <p>{{title}}</p>
  <b>Abstract</b>
  <p>{{abstract}}</p>
  <b>Journal/Year</b>
  <p>{{journal}}/{{year}}</p>
  <b>Sci-Hub链接</b>
  <p><a v-bind:href="sciHubDOI"> {{ sciHubDOI }} </a></p>
  <b>Citing</b>
  <b-table v-bind:data="cits_data" v-bind:columns="cits_cols"></b-table>
  </div>
  `
};

// import BuefySearchCompo from "./buefy-search-compo.js";

// const templ = `
//   <div>
//     <!--input placeholder="Type a phrase" v-model="query" /-->
//     <section class="is-medium">
//     <div class="container">
//       <!--h3 class="subtitle">With Material Design Icons</h3-->
//       <b-field>
//           <b-input placeholder="Search..."
//               type="search"
//               icon="magnify"
//               icon-clickable
//               v-model="query"
//               @icon-click="searchIconClick">
//           </b-input>
//       </b-field>
//       <div class="card is-info has-text-primary is-family-primary has-text-weight-medium is-medium">
//         <!--{{ phrase }}- --> {{ resultAlt }} <br/>
//         <b>Title</b>
//         <p>{{title}}</p>
//         <b>Abstract</b>
//         <p>{{abstract}}</p>
//         <b>Journal/Year</b>
//         <p>{{journal}}/{{year}}</p>
//         <b>Sci-Hub链接</b>
//         <p><a v-bind:href="sciHubDOI"> {{ sciHubDOI }} </a></p>
//         <b>Citing</b>
//         <b-table v-bind:data="cits_data" v-bind:columns="cits_cols"></b-table>
//       </div>
//     </div>
//     </section>
//   </div>
// `;
// new Vue({ // eslint-disable-line
//   el: "#app",
//   data() {
//     return {
//       query: ""
//     };
//   },
//   components: { BuefySearchCompo },
//   template: templ,
//   methods: {
//     searchIconClick() {
//       alert("搜索栏输入中文或英文");
//     }
//   }
// });