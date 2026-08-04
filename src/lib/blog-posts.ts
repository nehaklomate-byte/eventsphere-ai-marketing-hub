export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMinutes: number;
  audience: string;
  /** Body as ordered blocks so the renderer stays simple and safe. */
  body: ({ h: string } | { p: string } | { list: string[] })[];
};

export const posts: BlogPost[] = [
  {
    slug: "venue-enquiry-to-booking-checklist",
    title: "From enquiry to confirmed booking: a checklist for venue owners",
    description:
      "The eight things worth confirming in writing before a date is held, and why a held date without an advance causes most season conflicts.",
    category: "Venue operations",
    readMinutes: 6,
    audience: "For hall, lawn and banquet owners",
    body: [
      { p: "Most double-booked dates are not caused by carelessness. They are caused by a date being verbally held on one channel while a second enquiry arrives on another, with nothing written down in between. The fix is not a better memory — it is a fixed sequence that every enquiry passes through." },
      { h: "1. Capture the same six fields for every enquiry" },
      { p: "Whatever channel it arrives on, an enquiry is only useful if it carries the event date, the guest count, the function type, the contact name, a reachable number and the budget range. Anything missing turns into a follow-up call later." },
      { h: "2. Separate an enquiry from a hold" },
      { p: "An enquiry is interest. A hold is a commitment on your calendar that blocks other revenue. Give every hold an expiry — commonly 48 to 72 hours — and say the expiry out loud when you grant it. A hold with no expiry is how a peak-season Saturday quietly disappears." },
      { h: "3. Quote the full picture, not the hall rate" },
      { p: "The rate that causes disputes later is never the base rate. Put these in the same message:" },
      { list: [
        "Base rate per day or per slot, and what time the slot starts and ends",
        "Overtime charge per hour beyond the slot",
        "What is included: chairs, tables, basic lighting, cleaning, power backup",
        "What is charged separately: generator fuel, extra AC hours, additional rooms",
        "Parking capacity, and whether valet is arranged by you or the customer",
        "Advance amount and the cancellation and refund policy",
      ] },
      { h: "4. Confirm capacity honestly against the seating style" },
      { p: "A hall that seats 400 in theatre style does not seat 400 for a dinner with round tables. Publish indoor, outdoor and dining capacity separately. Customers who arrive expecting one number and find another do not come back, and they tell everyone." },
      { h: "5. Take the advance before the hold expires" },
      { p: "Until money moves, the date is not booked. Record the advance amount, the date it was received and the mode, against the booking itself — not in a separate cash book that only one person maintains." },
      { h: "6. Fix the timeline of the day in writing" },
      { p: "Decor entry time, kitchen access, sound check, guest arrival, and the vacate time. Vendors plan their own crews around these numbers, and every hour of ambiguity becomes an argument on the event day." },
      { h: "7. Assign your own vendors and staff against the booking" },
      { p: "Cleaning, lighting, security and support staff are part of your delivery, not a separate arrangement. Assign them with the date, timing and payout recorded, so nobody arrives late claiming they were told something else." },
      { h: "8. Close the loop after the event" },
      { p: "Settle the balance, note anything that went wrong, and ask for a review while the memory is fresh. A venue with genuine reviews from real bookings needs to argue about price far less often." },
      { h: "How EventOrbit handles this" },
      { p: "Enquiries from your public venue profile arrive in one inbox with the date, guest count and contact already attached. Your rates, capacity by seating type, facilities, working hours and cancellation policy sit on the profile itself, so most of the back-and-forth never starts. Vendors and workers for the date are hired from the same dashboard, and the booking keeps its own payment record." },
    ],
  },
  {
    slug: "vendor-scope-that-prevents-disputes",
    title: "Writing a vendor scope that survives the event day",
    description:
      "Decor, catering, sound and photography disputes almost always trace back to four unwritten assumptions. Here is how to close them before you accept a job.",
    category: "Vendor practice",
    readMinutes: 7,
    audience: "For decorators, caterers, sound and photo teams",
    body: [
      { p: "Vendors rarely lose money on the price they quoted. They lose it on what the price was assumed to include. Every recurring dispute in event services comes from one of four gaps, and each one can be closed with a single line in writing before you accept the job." },
      { h: "Gap 1: Quantity without a ceiling" },
      { p: "\"Decorate the entrance and stage\" has no upper bound. \"Stage backdrop 20ft x 10ft, two entrance arches, twelve pathway stands\" does. Quote against countable units, and state the rate for each additional unit so an on-the-day addition has a known price instead of a negotiation." },
      { h: "Gap 2: Time without a boundary" },
      { p: "Agree three separate timestamps: when you can access the venue, when your setup must be complete, and when you may begin dismantling. A caterer who gets kitchen access two hours late and a photographer asked to stay three hours extra are the same problem — an unpriced hour." },
      { list: [
        "Venue access time and who unlocks it",
        "Setup completion deadline",
        "Service window: start and end",
        "Dismantle and clearance time",
        "Overtime rate per hour beyond the window",
      ] },
      { h: "Gap 3: Dependencies you do not control" },
      { p: "Your delivery usually depends on someone else's. Power supply and backup, water, kitchen access, ladder or scaffolding permission, a cleared floor before setup, parking for your loading vehicle. Name each dependency and who is responsible for it. If the venue does not provide power backup, that sentence protects you when the lights fail." },
      { h: "Gap 4: Payment terms without triggers" },
      { p: "\"Balance after the event\" is not a term. Tie each payment to an event: advance on confirmation, a portion on setup completion, the balance within a stated number of days after the function. Record the amount and the status against the job, not in a personal diary." },
      { h: "Staffing your own crew" },
      { p: "If a job needs eight people, arranging them the night before is a risk you are carrying for free. Confirm the crew when you accept the job, with the reporting time and payout agreed per person. A crew that knows the address, the time and its pay does not need six calls on the morning of the event." },
      { h: "Rejecting work well" },
      { p: "Turning down a job you cannot deliver is cheaper than delivering it badly. Give a reason and give it fast — a client who gets an honest no on Monday can still find someone, and will call you again. A yes that collapses on Friday ends the relationship." },
      { h: "How EventOrbit handles this" },
      { p: "A job assigned to you arrives with the venue, address, date, start and end time, priority and description already attached, and accepting or rejecting is recorded against it with a reason. The payment amount and status stay on the same record, and workers you hire for the job are tracked through the same accept, start and complete flow." },
    ],
  },
  {
    slug: "event-worker-profile-that-gets-hired",
    title: "What actually gets an event worker hired repeatedly",
    description:
      "Verification, a specific skill list and a reliable status trail matter far more than a low rate. A practical guide for individuals and staffing agencies.",
    category: "Worker guide",
    readMinutes: 5,
    audience: "For stewards, technicians, helpers and agencies",
    body: [
      { p: "Event work is repeat business or it is nothing. The people who stay booked through a season are rarely the cheapest — they are the ones a coordinator can hand a job to without following up. Everything below is about being that person on paper before you are that person in the field." },
      { h: "Be specific about the skill, not the category" },
      { p: "\"Helper\" tells a coordinator nothing. \"Banquet steward, buffet service, 200+ guest functions, can handle bar service\" tells them whether to call you for tonight's job. List the skills you would be comfortable being tested on, and leave out the rest." },
      { h: "Finish verification early" },
      { p: "ID proof, a clear selfie and an emergency contact take ten minutes and are the difference between appearing in a search and not appearing at all. Nobody assigns a night shift at a venue to an unverified name." },
      { h: "State your working boundaries honestly" },
      { p: "Preferred cities, travel distance, working hours and blocked dates are not restrictions that cost you work — they stop you from being called for jobs you would have to refuse anyway. A profile that says no clearly gets a better quality of yes." },
      { h: "Charge structure beats a single number" },
      { p: "Hourly, daily, per-event and monthly rates all exist in this industry for good reasons. Publish the ones that apply to you and a minimum booking value if you have one, so a coordinator can budget without a call." },
      { h: "Build a work record, not a reputation" },
      { p: "A reputation lives in someone else's head. A record is yours. Accept jobs in the system, check in when you arrive, check out when you finish, and attach completion photos. After a season you have a verifiable history that travels with you to every new client." },
      { h: "For agencies" },
      { p: "Register as an agency rather than an individual, and put the team size, years in operation and the services you staff on the profile. Clients hiring twenty people care about whether you can replace someone who does not turn up — say so explicitly." },
      { h: "How EventOrbit handles this" },
      { p: "Your profile tracks its own completion percentage so you can see what is missing. Jobs are assigned to you alone, never broadcast, and check-in and check-out capture time, photo and location on the job record. Earnings and payment status sit on the same page, so what is pending is never a question of memory." },
    ],
  },
  {
    slug: "planning-a-function-without-getting-overcharged",
    title: "Planning a function without getting overcharged",
    description:
      "A practical order of operations for families booking a wedding or private function, and the specific questions that prevent the usual surprises.",
    category: "For customers",
    readMinutes: 6,
    audience: "For families and individuals planning an event",
    body: [
      { p: "Most overspending on a private function is not caused by expensive choices. It is caused by decisions made in the wrong order, under time pressure, with incomplete information. Fixing the order alone removes a large part of the problem." },
      { h: "Fix the guest count before anything else" },
      { p: "Guest count determines the venue, the catering, the staff count and half the decor. Every other number moves when it moves. Settle on a realistic figure — not an aspirational one — before you visit a single venue." },
      { h: "Set the budget as a split, not a total" },
      { p: "A single total is impossible to control. Split it into venue, catering, decor, photography, entertainment, staff and a contingency of roughly ten percent. When one head overruns, you can see immediately what has to give." },
      { h: "Ask venues these questions in the first conversation" },
      { list: [
        "What exactly does the rate include, and what is billed separately?",
        "Which capacity number applies to my seating style?",
        "Is there power backup, and who pays for fuel?",
        "Am I allowed outside caterers and decorators, or is there a mandatory panel?",
        "What time do we get access, and what time must we vacate?",
        "What is the cancellation and refund policy in writing?",
      ] },
      { p: "The mandatory panel question matters more than people expect. A competitive hall rate paired with a compulsory in-house caterer can cost more overall than a higher rate with free choice." },
      { h: "Book in dependency order" },
      { p: "Venue first, because the date and the space constrain everything. Then catering, because it is usually the largest single head. Then photography, because good teams are booked earliest. Decor, entertainment and staff can follow, since they adapt to the space." },
      { h: "Insist on written scope, not a total price" },
      { p: "For every vendor, get the countable version: how many arches, how many plates, how many hours of coverage, how many staff for how long. A number without a scope is not a quote, and it cannot be compared with another number." },
      { h: "Keep one record of what is paid" },
      { p: "Advances get paid across several weeks by different family members. Keep the amount, date and recipient in one place from day one, with receipts attached. The week before the event is the worst possible time to reconstruct it." },
      { h: "Review honestly afterwards" },
      { p: "Ratings only help the next family if they come from people who actually booked. Say what went well and what did not, specifically." },
      { h: "How EventOrbit handles this" },
      { p: "Every venue, vendor and worker in the marketplace is verified by our team before it appears, with real capacity, facilities and photos on the profile. Enquiries, bookings, payment history, invoices and your event details stay in one dashboard, and reviews come from accounts that actually booked." },
    ],
  },
];

export function getPost(slug: string) {
  return posts.find((p) => p.slug === slug);
}
