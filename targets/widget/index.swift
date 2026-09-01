import WidgetKit
import SwiftUI

// The Arete home-screen widget: one line from the tradition each day.
// Fetches the public daily-quote endpoint (deterministic per day, so every
// refresh shows the same line until midnight) and falls back to a bundled
// quote offline.

private let GOLD = Color(red: 0.788, green: 0.659, blue: 0.298)
private let PARCHMENT = Color(red: 0.878, green: 0.835, blue: 0.710)
private let NAVY = Color(red: 0.102, green: 0.102, blue: 0.180)
private let MUTED = Color(red: 0.541, green: 0.608, blue: 0.690)

struct QuoteEntry: TimelineEntry {
    let date: Date
    let text: String
    let author: String
}

private let FALLBACK = QuoteEntry(
    date: Date(),
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius"
)

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> QuoteEntry { FALLBACK }

    func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
        completion(FALLBACK)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
        guard let url = URL(string: "https://arete-app-production.up.railway.app/api/widget/quote") else {
            completion(Timeline(entries: [FALLBACK], policy: .after(nextRefresh())))
            return
        }
        let task = URLSession.shared.dataTask(with: url) { data, _, _ in
            var entry = FALLBACK
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let text = json["text"] as? String,
               let author = json["author"] as? String {
                entry = QuoteEntry(date: Date(), text: text, author: author)
            }
            completion(Timeline(entries: [entry], policy: .after(nextRefresh())))
        }
        task.resume()
    }

    private func nextRefresh() -> Date {
        Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date().addingTimeInterval(21600)
    }
}

struct AreteWidgetView: View {
    var entry: QuoteEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("A R E T E")
                .font(.system(size: 9, weight: .bold))
                .kerning(1.5)
                .foregroundColor(GOLD)
            Spacer(minLength: 2)
            Text(entry.text)
                .font(.system(size: family == .systemSmall ? 12 : 14, weight: .medium, design: .serif))
                .italic()
                .foregroundColor(PARCHMENT)
                .minimumScaleFactor(0.6)
                .lineLimit(family == .systemSmall ? 6 : 4)
            Text("— " + entry.author)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(MUTED)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(NAVY, for: .widget)
    }
}

struct AreteWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AreteQuoteWidget", provider: Provider()) { entry in
            AreteWidgetView(entry: entry)
        }
        .configurationDisplayName("Daily Line")
        .description("One line from the tradition, every day.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct AreteWidgetBundle: WidgetBundle {
    var body: some Widget {
        AreteWidget()
    }
}
