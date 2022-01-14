new Vue({
  el: "#app",
  data() {
    return {
      msg: ""
    };
  },
  methods: {
    hello: function (evt) {
      this.msg = "hellooo...";
    }
  },
  template: `
	<div>
		<button v-on:click="hello">Say it</button>
		<p>Saying: {{ msg }}</p>
	</div>
	`
});