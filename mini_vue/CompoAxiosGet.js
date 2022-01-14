const inst = axios.create({ // eslint-disable-line
  baseURL: "https://api.semanticscholar.org/v1/paper",
  timeout: 3000,
  headers: {
    UserAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1309.0 Safari/537.17"
  }
});
// baseURL: "https://api.crossref.org/works/",
// baseURL: "https://api.semanticscholar.org/v1/paper",

export default {
  data: function () {
    return { result: this.phrase };
  },
  props: ["phrase"],
  watch: {
    phrase: function (newVal, oldVal) { // eslint-disable-line
      // this.result = newVal;
      if (newVal == "") return "";

      // let serviceCode = "10.1038/nrn3241";
      let query = newVal;
      inst
        .get(`/${query}`)
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
    }
  },
  template: `
  <div>
  {{ resultAlt }} <br/> {{ result }}
  <div v-html="result"></div>
  </div>
  `
};