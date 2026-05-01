async function test() {
  try {
    const obj = {};
    await obj.missingFunction();
  } catch(e) {
    console.log("Caught:", e.message);
  }
}
test().then(() => console.log("Done"));
