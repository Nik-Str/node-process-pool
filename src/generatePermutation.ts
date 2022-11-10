export default function generatePermutations(amount: number) {
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let combinations = numbers;

  if (amount === 1) {
    for (let i = 0; i < combinations.length; i++) {
      // Testa singel tal
      console.log(combinations[i]);
    }
    return;
  }

  for (let i = 0; i < amount - 1; i++) {
    const newCombination = [];

    for (let j = 0; j < numbers.length; j++) {
      for (let k = 0; k < combinations.length; k++) {
        newCombination.push(numbers[j] + combinations[k]);
        // Test kombinationer
        console.log(numbers[j] + combinations[k]);
      }
    }
    combinations = newCombination;
    if (combinations[0].length === amount) return;
  }
}
