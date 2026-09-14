package com.flow.finance.core.parser

/**
 * Merchant keyword dictionary: maps recognized merchant names to a clean
 * display name and a default category. Pure Kotlin — unit-testable.
 * Longer keywords are checked first ("AMAZON PRIME" before "AMAZON").
 */
object MerchantDictionary {

    data class Entry(val keyword: String, val display: String, val category: String)

    private val entries: List<Entry> = listOf(
        Entry("AMAZON PRIME", "Amazon Prime", "Subscriptions"),
        Entry("YOUTUBE PREMIUM", "YouTube Premium", "Subscriptions"),
        Entry("GOLDS GYM", "Gold's Gym", "Health"),
        Entry("APOLLO PHARMACY", "Apollo Pharmacy", "Health"),
        Entry("INDIAN OIL", "Indian Oil", "Travel"),
        Entry("BSES RAJDHANI", "BSES Rajdhani", "Bills"),
        Entry("TATA POWER", "Tata Power", "Bills"),
        Entry("PHONEPE", "PhonePe", "Transfers"),
        Entry("PAYTM", "Paytm", "Transfers"),
        Entry("SWIGGY", "Swiggy", "Food"),
        Entry("ZOMATO", "Zomato", "Food"),
        Entry("DOMINOS", "Domino's", "Food"),
        Entry("PIZZA HUT", "Pizza Hut", "Food"),
        Entry("MCDONALD", "McDonald's", "Food"),
        Entry("STARBUCKS", "Starbucks", "Food"),
        Entry("EATFIT", "EatFit", "Food"),
        Entry("BIGBASKET", "BigBasket", "Groceries"),
        Entry("GROFERS", "Grofers", "Groceries"),
        Entry("BLINKIT", "Blinkit", "Groceries"),
        Entry("ZEPTO", "Zepto", "Groceries"),
        Entry("DMART", "DMart", "Groceries"),
        Entry("AMAZON", "Amazon", "Shopping"),
        Entry("FLIPKART", "Flipkart", "Shopping"),
        Entry("MYNTRA", "Myntra", "Shopping"),
        Entry("AJIO", "Ajio", "Shopping"),
        Entry("NYKAA", "Nykaa", "Shopping"),
        Entry("NETFLIX", "Netflix", "Subscriptions"),
        Entry("SPOTIFY", "Spotify", "Subscriptions"),
        Entry("HOTSTAR", "Hotstar", "Subscriptions"),
        Entry("JIO", "Jio", "Bills"),
        Entry("AIRTEL", "Airtel", "Bills"),
        Entry("VODAFONE", "Vodafone", "Bills"),
        Entry("BSNL", "BSNL", "Bills"),
        Entry("ELECTRICITY", "Electricity", "Bills"),
        Entry("UBER", "Uber", "Travel"),
        Entry("OLA", "Ola", "Travel"),
        Entry("RAPIDO", "Rapido", "Travel"),
        Entry("IRCTC", "IRCTC", "Travel"),
        Entry("INDIGO", "IndiGo", "Travel"),
        Entry("MAKEMYTRIP", "MakeMyTrip", "Travel"),
        Entry("REDBUS", "redBus", "Travel"),
        Entry("NETMEDS", "Netmeds", "Health"),
        Entry("PHARMEASY", "PharmEasy", "Health"),
        Entry("1MG", "1mg", "Health"),
        Entry("APOLLO", "Apollo", "Health"),
        Entry("UDEMY", "Udemy", "Education"),
        Entry("COURSERA", "Coursera", "Education"),
        Entry("BYJU", "Byju's", "Education"),
        Entry("PVR", "PVR", "Entertainment"),
        Entry("BOOKMYSHOW", "BookMyShow", "Entertainment"),
        Entry("ATM", "ATM", "Cash"),
        Entry("SALARY", "Salary", "Transfers"),
        Entry("INTEREST", "Interest", "Transfers")
    ).sortedByDescending { it.keyword.length }

    /** Match against an extracted merchant name (substring match). */
    fun lookup(merchantUpper: String): Entry? =
        entries.firstOrNull { merchantUpper.contains(it.keyword) }

    /** Last resort: scan the whole message body for a recognizable name. */
    fun scanBody(bodyUpper: String): Entry? =
        entries.firstOrNull { bodyUpper.contains(it.keyword) }
}
