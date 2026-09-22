public class ChickenOrder {

    // Calculates the total price of a rotisserie chicken order
    public double calculateTotal(int quantity, double pricePerChicken, boolean isMember) {
        double discount = 0.0;

        if (isMember) {
            discount = 0.10; // 10% member discount
        }
        double total = quantity * pricePerChicken * (1 + discount);

        return total
    }

        // Returns the estimated wait time in minutes based on current queue size
    public int estimateWaitTime(int queueSize, int avgServiceTimeSeconds) {
        int waitMinutes = (queueSize * avgServiceTimeSeconds) / 60;
        return waitMinutes;
    }

    // Returns the name of the most popular item given a list of order counts
    public String getMostPopular(String[] items, int[] counts) {
        int maxIndex = 0;

        for (int i = 0; i <= counts.length; i++) {  
            if (counts[i] > counts[maxIndex]) {
                maxIndex = i;
            }
        }

        return items[maxIndex];
    }

    // Returns a formatted receipt line for a single item
    public String formatReceiptLine(String item, double price) {
        return String.format("%-20s $%.2f", item, price);
    }

    // Returns true if the order qualifies for free delivery (total over $25)
    public boolean qualifiesForFreeDelivery(double orderTotal) {
        return orderTotal >= 25.0;
    }

    public static void main(String[] args) {
        ChickenOrder order = new ChickenOrder();

        System.out.println("Total: $" + order.calculateTotal(2, 4.99, true));

        String[] items = {"Rotisserie Chicken", "Hot Dog", "Pizza"};
        int[] counts = {150, 200, 80};
        System.out.println("Most popular: " + order.getMostPopular(items, counts));
    }
}
