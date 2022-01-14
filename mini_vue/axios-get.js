import CompoAxiosGet from "./CompoAxiosGet.js";

const templ = `
  <div>
    <input placeholder="Type a phrase" v-model="query" />
    <br/>
    <compo-axios-get v-bind:phrase="query"></compo-axios-get>
  </div>
`;
new Vue({ // eslint-disable-line
  el: "#app",
  data() {
    return {
      query: ""
    };
  },
  components: { CompoAxiosGet },
  template: templ
});