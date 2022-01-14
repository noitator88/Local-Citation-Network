const templ = `
<div>
<input placeholder="edit me" v-bind:value="msg" />
<p>Message is: {{ msg }}</p>
</div>
`
new Vue({
  el: "#app",
  data: { msg: "hello from vue" },
  template: templ
});