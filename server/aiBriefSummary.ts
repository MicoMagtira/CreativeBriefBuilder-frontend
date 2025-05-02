import { Request, Response } from 'express';
import { getBrandInfo, addSummaryToBrief } from './briefInfo.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/briefs/:id/generate-summary
 * Generates a comprehensive AI summary for the brief, covering all key sections.
 */
export async function generateBriefSummaryHandler(req: Request, res: Response) {
  const { id: briefId } = req.params;
  const brief = getBrandInfo(briefId);
  if (!brief) {
    return res.status(404).json({ error: 'Brief not found.' });
  }

  // Aggregate all relevant info
  const { clientName, industry, productUrl, productList, brandGuidelines, audience, offers, visualAssets, brandReviews, aiSummaries } = brief;
  // Use the latest Review Insights from aiSummaries, fallback to raw reviews if not available
  let reviewInsights = '';
  if (Array.isArray(aiSummaries)) {
    const latestReviewInsight = [...aiSummaries].reverse().find(s => s.fileName === 'Review Insights');
    if (latestReviewInsight) {
      reviewInsights = latestReviewInsight.summary;
    }
  }
  if (!reviewInsights) {
    reviewInsights = brandReviews?.reviews?.join('\n') || '';
  }

  // Compose a structured prompt in the user's requested format
   const prompt = `You are an expert strategist for DTC brands. Analyze the following brand brief and customer reviews, and generate a comprehensive, actionable creative brief summary using the exact structure and markdown formatting below. Use all available data, and fill each section with relevant, specific, and creative insights based on the information provided.

Brand Info:
- Name: ${clientName}
- Industry: ${industry}
- Product URL: ${productUrl}
- Product List: ${productList}
- Guidelines: ${brandGuidelines || ''}

---

**STRUCTURED SUMMARY FORMAT:**

1. **BENEFITS**
   - High-quality construction ensures durability and long-term use.
   - Comfortable fit, ideal for extended periods of walking.
   - Stylish design that aligns with contemporary fashion trends.
   - Eco-friendly materials appeal to sustainability-conscious consumers.
   - Positive brand reputation enhances customer trust.

2. **PAIN POINTS**
   - Need for shoes that can be worn comfortably for long walks.
   - Difficulty finding stylish yet sustainable footwear.
   - Concerns over the durability of eco-friendly products.
   - Limited options for affordable, high-quality footwear for seniors.

3. **OBJECTIONS**
   - Concerns about the higher cost associated with sustainable materials.
   - Uncertainty about the comfort of fashion-forward shoe designs.
   - Skepticism regarding the true sustainability of the products.

4. **EMOTIONAL DRIVERS**
   - Comfort: Ensuring physical ease and relief from pain during walking.
   - Trust: Building confidence in the brand's quality and customer service.
   - Pride: Owning a product that is both stylish and environmentally friendly.
   - Belonging: Feeling part of a community that values sustainability.

5. **PERSONAS**
   - **Eco-conscious Emma**
     - Age: 65
     - Demographics: Retired, lives in urban area
     - Psychographics: Values sustainability, prefers quality over quantity
     - Pain Points: Finds it hard to get stylish, eco-friendly shoes
     - Awareness Level: High awareness of environmental issues, moderate brand awareness
   
   - **Active Arnold**
     - Age: 68
     - Demographics: Active senior, part-time volunteer
     - Psychographics: Health-conscious, enjoys outdoor activities
     - Pain Points: Needs durable, comfortable footwear for daily walking
     - Awareness Level: Low brand awareness, high product need awareness

6. **TRIGGER EVENTS**
   - Upgrading old, worn-out walking shoes.
   - Receiving a doctor’s recommendation for supportive footwear.
   - Preparing for a walking tour or active vacation.
   - Seeking pain relief from arthritis or foot ailments.
   - Attending a community event or social gathering.
   - Seasonal changes that require appropriate footwear.
   - Receiving a promotional offer or discount.

7. **COMPARISON TABLE**
   | Feature           | Our Product       | Competitor        |
   |-------------------|-------------------|-------------------|
   | Material Quality  | High-quality, sustainable materials | Standard materials |
   | Price             | Affordable with discounts for seniors | Generally higher priced |
   | Design            | Fashion-forward, modern | Traditional styles |
   | Customer Service  | Highly rated customer service | Mixed reviews |
   | Sustainability    | Strong commitment to eco-friendly practices | Limited or no eco-focus |

8. **FAQs & COMMENT RESPONSES**
   - **Q: Are these shoes truly comfortable for all-day wear?**
     - A: Absolutely! Our shoes are designed with senior comfort in mind, featuring supportive soles and soft materials that make all-day wear a breeze.
   - **Q: How sustainable are your materials?**
     - A: We're committed to sustainability. Our shoes are made from eco-friendly materials that are both durable and biodegradable, ensuring minimal environmental impact.
   - **Q: Can I return the shoes if they don't fit?**
     - A: Yes, we offer a hassle-free return policy. If your shoes don’t fit perfectly, you can return them within 30 days for a full refund or exchange.

9. **PRODUCT INSIGHTS & ANGLES**
   - Highlight the dual benefit of style and comfort specifically designed for seniors.
   - Emphasize the eco-friendly materials as a key selling point.
   - Showcase customer testimonials focusing on the positive purchase experience and product quality.
   - Use a problem-solution angle addressing the challenge of finding sustainable, comfortable shoes.

10. **HEADLINE OPTIONS**
   - "Walk in Style, Comfort, and Conscience with Shoe!"
   - "Feel the Difference: Sustainable Comfort for Active Seniors!"
   - "Step into a Sustainable Future with Our Eco-Friendly Shoes!"
   - "Designed for Comfort, Made for Walking: Discover Our Senior-Friendly Shoes!"
   - "Where Style Meets Comfort – Footwear for the Fashionable Senior!"

11. **HOOK ANGLES**
   - "Tired of choosing between style and comfort? Now, you don’t have to!"
   - "Join the Green Revolution – One Step at a Time!"
   - "Why sacrifice comfort for style when you can have both?"
   - "Elderly feet deserve the best – treat them today!"
   - "Walk pain-free and proud with our sustainable shoes!"

12. **PRIMARY BODY COPY VARIATIONS**
   - **Agitate-Resolve:** "Struggling with foot pain during your walks? Our shoes are crafted to provide unparalleled comfort and support, making every step pain-free."
   - **Social Proof:** "Join thousands of satisfied seniors who’ve transformed their walking experience with our shoes. Feel the difference today!"
   - **Identity-Based:** "For the eco-conscious walker, our shoes offer the perfect blend of sustainability and style. Be proud of what you wear!"
   - **Transformation Arc:** "From uncomfortable walks to joyful strides – see how our shoes can change your walking experience."
   - **Aspiration:** "Imagine walking 10,000 steps and still feeling fresh. With our shoes, it’s not just possible; it’s a daily reality!"

---

BRIEF DATA:
${JSON.stringify({ audience, offers, visualAssets, reviewInsights }, null, 2)}

---

**Use markdown for all bullets and tables. Return each section clearly labeled, using the above structure. Make each section actionable and specific for a creative brief. Do not include any generic or filler text. Only use information relevant to the brand and reviews provided.**`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are an expert strategist for DTC brands.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    });
    const summary = completion.choices[0]?.message?.content || '';
    await addSummaryToBrief(briefId, summary, 'AI Creative Brief Summary');
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to generate summary.' });
  }
}
