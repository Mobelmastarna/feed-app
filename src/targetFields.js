/**
 * OpenAI Ads produktschema (CSV). Källa:
 * https://developers.openai.com/commerce/specs/file-upload/products
 * Ordningen här styr både kolumnordningen i den genererade CSV:n och
 * ordningen fälten visas i i mappnings-UI:t.
 */
const TARGET_FIELDS = [
  // Grundläggande (obligatoriska)
  { key: "item_id", label: "Produkt-ID", required: true, group: "Grundläggande", hint: "Unikt, stabilt ID per produkt/variant." },
  { key: "title", label: "Titel", required: true, group: "Grundläggande", hint: "Max 150 tecken." },
  { key: "description", label: "Beskrivning", required: true, group: "Grundläggande", hint: "Max 5000 tecken." },
  { key: "url", label: "Produktsida (URL)", required: true, group: "Grundläggande" },
  { key: "brand", label: "Varumärke", required: true, group: "Grundläggande" },
  { key: "image_url", label: "Bild-URL", required: true, group: "Grundläggande" },

  // Pris & lager (obligatoriska)
  { key: "price", label: "Pris", required: true, group: "Pris & lager", hint: 'Format: "belopp VALUTAKOD", t.ex. "799.00 SEK".' },
  { key: "availability", label: "Lagerstatus", required: true, group: "Pris & lager", hint: "Normaliseras automatiskt till in_stock/out_of_stock/pre_order/backorder/unknown." },
  { key: "sale_price", label: "Reapris", required: false, group: "Pris & lager", hint: "Måste vara lägre än pris, samma valuta." },

  // Säljare & policy
  { key: "seller_name", label: "Säljarens namn", required: true, group: "Säljare & policy" },
  { key: "seller_url", label: "Säljarens webbplats", required: false, group: "Säljare & policy" },
  { key: "return_policy", label: "Returpolicy (URL)", required: false, group: "Säljare & policy" },

  // Annonser & sökbarhet
  { key: "target_countries", label: "Målländer", required: false, group: "Annonser & sökbarhet", hint: "ISO 3166-1 alpha-2, t.ex. SE." },
  { key: "store_country", label: "Butikens land", required: false, group: "Annonser & sökbarhet", hint: "ISO 3166-1 alpha-2, t.ex. SE." },
  { key: "is_eligible_search", label: "Sökbar", required: false, group: "Annonser & sökbarhet", hint: "true/false, standard true om ej satt." },
  { key: "is_eligible_checkout", label: "Kassaflöde tillåtet", required: false, group: "Annonser & sökbarhet", hint: "true/false, standard false om ej satt." },
  { key: "is_ads_eligible", label: "Annonsbar", required: false, group: "Annonser & sökbarhet" },

  // Övrigt
  { key: "gtin", label: "GTIN", required: false, group: "Övrigt", hint: "8/12/13/14 siffror, behåll ledande nollor." },
  { key: "mpn", label: "MPN (tillverkarnummer)", required: false, group: "Övrigt" },
  { key: "condition", label: "Skick", required: false, group: "Övrigt", hint: "new/refurbished/used." },
  { key: "product_category", label: "Produktkategori", required: false, group: "Övrigt", hint: 'Bred till specifik, separerad med ">".' },
  { key: "color", label: "Färg", required: false, group: "Övrigt" },
  { key: "size", label: "Storlek", required: false, group: "Övrigt" },
  { key: "group_id", label: "Variantgrupp-ID", required: false, group: "Övrigt" },
  { key: "additional_image_urls", label: "Fler bild-URL:er", required: false, group: "Övrigt", hint: "Kommaseparerade om flera." },
];

module.exports = { TARGET_FIELDS };
