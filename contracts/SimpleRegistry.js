class SimpleRegistry {
  // Class properties are automatically persisted state
  name = "Guest";
  count = 0;

  setName(newName) {
    // Use 'this.' to access state
    this.name = newName;
    this.count += 1;
    console.log("Name updated to:", this.name);
    console.log("Total changes:", this.count);
  }

  reset() {
    this.name = "Guest";
    console.log("Registry reset.");
  }
}
