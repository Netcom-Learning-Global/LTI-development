<script setup>
import { ref, onMounted } from "vue";

const { query } = useRoute();

if (!query.lti) {
  console.error("Missing LTI token query parameter");
}

const options = ref([]);
const selected = ref(null);

// Fetch data
onMounted(async () => {
  try {
    const res = await $fetch("/api/exams");
    options.value = res.map((item) => ({
      label: item.name,
      value: String(item.id),
    }));

    if (options.value.length > 0) {
      selected.value = options.value[0].value;
    }
  } catch (err) {
    console.error(err);
  }
});

const submit = async () => {
   const selectedOption = options.value.find(
    (opt) => opt.value == selected.value
  );

  // ✅ Show preview
  document.querySelector(".card").innerHTML = `
    <h3>✅ Exam Selected</h3>
    <p>${selectedOption?.label}</p>
  `;

  const form = await $fetch("/deep-link-resource", {
    method: "POST",
    body: {  resourceId: Number(selected.value), title: selectedOption?.label, },
    headers: {
      Authorization: `Bearer ${query.lti}`,
    },
    parseResponse: (txt) => txt,
  });
// ✅ Auto submit form (close popup)
  const temp = document.createElement("div");
  temp.innerHTML = form;

  const formEl = temp.querySelector("form");
  if (formEl) {
    document.body.appendChild(formEl);
    formEl.submit();
  }
};
</script>

<template>
  <div class="container">
    <div class="card">

      <label class="label">Choose Resource</label>

      <USelect
        v-model="selected"
        :options="options"
        placeholder="Select Resource"
        class="dropdown"
      />

      <UButton
        class="btn"
        @click="submit"
        :disabled="!selected"
      >
        Submit
      </UButton>
    </div>
  </div>
</template>

<style scoped>
/* Page center */
.container {
  display: inline;
  text-align: center;
}

/* Card UI */
.card {
  background: #000;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
.card h3{
  color:#000;
}
/* Title */
.title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

/* Label */
.label {
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
}

/* Dropdown */
.dropdown {
  margin-bottom: 20px;
}

/* Button */
.btn {
  width: 100%;
  background-color: #16833d;
  color: white;
  font-weight: 500;
  padding: 10px;
  border-radius: 8px;
  transition: 0.3s;
  text-align: center;
  display: block;
}

</style>