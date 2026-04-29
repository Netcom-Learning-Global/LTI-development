<script setup>
import { onMounted } from "vue";

const route = useRoute();

const resourceId = route.params.id;
const ltiToken = route.query.lti;

onMounted(async () => {
  console.log("Url generated");
  try {
    const res = await $fetch("/api/generate-exam", {
      method: "POST",
      body: {
        resourceId: Number(resourceId),
        ltiToken,
      },
    });

    // 🔥 Redirect to exam portal
    console.log("redirect",res);
    window.location.href = res.redirectUrl;
  } catch (err) {
    console.error("Error:", err);
  }
});
</script>

<template>
  <div>
    <h2>Wait for 5 to 10 Sec Exam Link is Opening in New window...</h2>
  </div>
</template>