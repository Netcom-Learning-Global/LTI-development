<script setup>
import { ref, watch, onMounted } from "vue";
const { query } = useRoute();
if (!query.lti) {
  console.error("Missing LTI token query parameter");
}

const options = ref([]);
const filteredOptions = ref([]);
const selected = ref(null);
const search = ref("");
const loading = ref(false);

// Fetch exams
const fetchExams = async (searchQuery = "") => {
  try {
    loading.value = true;

    const res = await $fetch("/api/exams", {
      query: {
        searchQuery,
        page: 1,
        limit: 10,
      },
    });

    options.value = res.map((item) => ({
      label: item.name,
      value: String(item.id),
    }));

    filteredOptions.value = options.value;

    if (!selected.value && options.value.length > 0) {
      selected.value = options.value[0].value;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// Initial load
onMounted(() => {
  fetchExams();
});

// Search exams
let timeout = null;

watch(search, (val) => {
  clearTimeout(timeout);

  timeout = setTimeout(() => {
    fetchExams(val);
  }, 500);
});
const submit = async () => {
  const selectedOption = options.value.find(
    (opt) => opt.value == selected.value
  );

  // Preview
  document.querySelector(".card").innerHTML = `
    <h3 style="color:#000">✅ Exam Selected</h3>
    <p style="color:#000">${selectedOption?.label}</p>
  `;

  const form = await $fetch("/deep-link-resource", {
    method: "POST",
    body: {
      resourceId: Number(selected.value),
      title: selectedOption?.label,
    },
    headers: {
      Authorization: `Bearer ${query.lti}`,
    },
    parseResponse: (txt) => txt,
  });

  // Auto submit form
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
      <h2 class="title">Select Exam</h2>

      <!-- Search -->
      <input
        v-model="search"
        type="text"
        class="search-box"
        placeholder="Search exam..."
      />

      <!-- Exam List -->
      <div class="exam-list">
        <label
          v-for="exam in filteredOptions"
          :key="exam.value"
          class="exam-item"
        >
          <input
            type="radio"
            :value="exam.value"
            v-model="selected"
          />

          <span>{{ exam.label }}</span>
        </label>

        <div
          v-if="filteredOptions.length === 0"
          class="empty"
        >
          No exams found
        </div>
      </div>

      <!-- Submit -->
      <button
        class="btn"
        @click="submit"
        :disabled="!selected || loading"
      >
        {{ loading ? "Loading..." : "Submit" }}
      </button>
    </div>
  </div>
</template>
<style scoped>
html,
body,
#__nuxt {
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #f4f6f9;
}

.container {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: hidden;
  background: #f4f6f9;
}
.card {
  width: 420px;
  max-width: calc(100vw - 40px);
  background: #fff;
  padding: 24px;
  border-radius: 14px;
  box-sizing: border-box;
}
.exam-list span{
  color:#000;
}

.title {
  text-align: center;
  margin-bottom: 18px;
  font-size: 22px;
  font-weight: 600;
  color: #222;
}

.search-box {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdcdc;
  border-radius: 8px;
  margin-bottom: 16px;
  outline: none;
  font-size: 14px;
}

.search-box:focus {
  border-color: #CFA935;
}

.exam-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ececec;
  border-radius: 10px;
  margin-bottom: 20px;
}

.exam-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f1f1f1;
  transition: 0.2s;
}

.exam-item:hover {
  background: #f7f7f7;
}

.exam-item:last-child {
  border-bottom: none;
}

.empty {
  padding: 16px;
  text-align: center;
  color: #888;
}

.btn {
  width: 100%;
  background: #CFA935;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: 0.3s;
}

.btn:hover {
  background: #CFA935;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>