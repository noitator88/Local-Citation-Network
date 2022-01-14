import BuefySearchCompo from "./buefy-search-compo.js";

const templ = `
  <div>
    <!--input placeholder="Type a phrase" v-model="query" /-->
    <section class="is-medium">
    <div class="container">
      <!--h3 class="subtitle">With Material Design Icons</h3-->
      <b-field>
          <b-input placeholder="Search..."
              type="search"
              icon="magnify"
              icon-clickable
              v-model="query"
              @icon-click="searchIconClick">
          </b-input>
      </b-field>
      <div class="card is-info has-text-primary is-family-primary has-text-weight-medium is-medium">
      <buefy-search-compo v-bind:phrase="query"></buefy-search-compo>
      </div>
    </div>
    </section>
  </div>
`;
new Vue({ // eslint-disable-line
  el: "#app",
  data() {
    return {
      query: ""
    };
  },
  components: { BuefySearchCompo },
  template: templ,
  methods: {
    searchIconClick() {
      alert("搜索栏输入中文或英文");
    }
  }
});