const templ = `
<div>
<input placeholder="edit me" v-model="msg" />
<p>Message is: {{ msg }}</p>
</div>
`
new Vue({
  el: "#app",
  data: { msg: "" },
  template: templ
});