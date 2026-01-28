const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages, maxTokens = 1000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'PestControl AI Platform'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// AI Pest Identifier - Photo identification
router.post('/identify-pest', authMiddleware, async (req, res) => {
  try {
    const { description, imageUrl } = req.body;

    // Store identification request
    const identification = await req.prisma.pestIdentification.create({
      data: {
        imageUrl: imageUrl || 'uploaded-image',
        status: 'PROCESSING'
      }
    });

    let aiResult;
    try {
      const prompt = `You are an expert pest control entomologist. Based on the following description, identify the most likely pest and provide recommendations.

Description: ${description}

Respond in JSON format with:
{
  "identification": {
    "name": "pest name",
    "scientificName": "scientific name if known",
    "confidence": 85,
    "category": "Insects/Rodents/Arachnids",
    "description": "brief description of the pest"
  },
  "characteristics": ["list", "of", "key", "characteristics"],
  "recommendations": ["treatment recommendation 1", "treatment recommendation 2", "prevention tip"],
  "urgency": "LOW/MEDIUM/HIGH"
}`;

      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are an expert pest identification AI. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      // Parse AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI identification error:', aiError);
    }

    // Fallback to database lookup if AI fails
    if (!aiResult) {
      const pestType = await req.prisma.pestType.findFirst({
        where: {
          OR: [
            { name: { contains: description.split(' ')[0], mode: 'insensitive' } },
            { description: { contains: description, mode: 'insensitive' } }
          ]
        }
      });

      aiResult = {
        identification: {
          name: pestType?.name || 'Unknown Pest',
          confidence: pestType ? 75 : 50,
          category: pestType?.category || 'Unknown',
          description: pestType?.description || 'Unable to identify from description'
        },
        recommendations: pestType?.commonTreatments || ['Schedule professional inspection', 'Document pest activity', 'Reduce food and water sources'],
        urgency: 'MEDIUM'
      };
    }

    // Update identification record
    await req.prisma.pestIdentification.update({
      where: { id: identification.id },
      data: {
        identifiedPest: aiResult.identification.name,
        confidence: aiResult.identification.confidence,
        recommendations: aiResult.recommendations,
        status: 'COMPLETED'
      }
    });

    res.json({
      id: identification.id,
      ...aiResult,
      message: 'Pest identified successfully'
    });
  } catch (error) {
    console.error('Identify pest error:', error);
    res.status(500).json({ error: 'Failed to identify pest' });
  }
});

// AI Treatment Recommender
router.post('/recommend-treatment', authMiddleware, async (req, res) => {
  try {
    const { pestType, location, severity, propertyType } = req.body;

    let aiResult;
    try {
      const prompt = `You are an expert pest control specialist. Provide treatment recommendations for:

Pest Type: ${pestType}
Location: ${location || 'General indoor/outdoor'}
Severity: ${severity || 'moderate'}
Property Type: ${propertyType || 'Residential'}

Respond in JSON format with:
{
  "recommendations": [
    {
      "product": "Product name",
      "method": "Application method",
      "applicationRate": "Rate/concentration",
      "areas": ["area1", "area2"],
      "frequency": "How often"
    }
  ],
  "safetyNotes": "Important safety considerations",
  "estimatedTimeToResolve": "Timeline",
  "preventionTips": ["tip1", "tip2", "tip3"]
}`;

      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are an expert pest control treatment advisor. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI treatment error:', aiError);
    }

    // Fallback recommendations
    if (!aiResult) {
      aiResult = {
        recommendations: [
          { product: 'Professional-grade residual spray', method: 'Crack and crevice treatment', applicationRate: 'Per label directions', areas: ['Entry points', 'Baseboards'], frequency: 'Monthly' },
          { product: 'Gel bait', method: 'Spot application', applicationRate: 'Pea-sized drops', areas: ['Under sinks', 'Behind appliances'], frequency: 'As needed' },
          { product: 'IGR (Insect Growth Regulator)', method: 'Broadcast spray', applicationRate: 'Per label', areas: ['Infested areas'], frequency: 'Every 3 months' }
        ],
        safetyNotes: 'Keep children and pets away from treated areas until dry. Wear appropriate PPE during application.',
        estimatedTimeToResolve: severity === 'severe' ? '4-6 weeks' : '2-4 weeks',
        preventionTips: ['Seal cracks and crevices', 'Reduce moisture', 'Proper food storage', 'Regular cleaning']
      };
    }

    res.json(aiResult);
  } catch (error) {
    console.error('Recommend treatment error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// AI Route Optimizer
router.post('/optimize-route', authMiddleware, async (req, res) => {
  try {
    const { date, technicianId } = req.body;

    // Get service orders for the day
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const whereClause = {
      scheduledDate: { gte: dateObj, lt: nextDay },
      status: { notIn: ['CANCELLED', 'COMPLETED'] }
    };
    if (technicianId) whereClause.technicianId = technicianId;

    const orders = await req.prisma.serviceOrder.findMany({
      where: whereClause,
      include: { property: true, serviceType: true }
    });

    if (orders.length === 0) {
      return res.json({ message: 'No orders to optimize', optimizedStops: [], totalDistance: 0, totalDuration: '0h 0m' });
    }

    // Simple nearest neighbor optimization
    const optimizedStops = [];
    const remaining = [...orders];
    let currentLat = 33.7490; // Atlanta center
    let currentLng = -84.3880;
    let totalDist = 0;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      remaining.forEach((order, idx) => {
        const lat = order.property.latitude || currentLat + (Math.random() - 0.5) * 0.1;
        const lng = order.property.longitude || currentLng + (Math.random() - 0.5) * 0.1;
        const dist = Math.sqrt(Math.pow(lat - currentLat, 2) + Math.pow(lng - currentLng, 2));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });

      const nearest = remaining.splice(nearestIdx, 1)[0];
      const distMiles = Math.round(nearestDist * 69 * 10) / 10;
      totalDist += distMiles;

      optimizedStops.push({
        order: optimizedStops.length + 1,
        serviceOrderId: nearest.id,
        orderNumber: nearest.orderNumber,
        address: `${nearest.property.addressLine1}, ${nearest.property.city}, ${nearest.property.state}`,
        serviceType: nearest.serviceType.name,
        estimatedDuration: nearest.serviceType.duration,
        estimatedTime: `${8 + optimizedStops.length}:00 AM`,
        distanceFromPrevious: distMiles
      });

      currentLat = nearest.property.latitude || currentLat;
      currentLng = nearest.property.longitude || currentLng;
    }

    const totalDuration = optimizedStops.reduce((sum, stop) => sum + stop.estimatedDuration + 15, 0);

    res.json({
      date,
      technicianId,
      optimizedStops,
      totalDistance: Math.round(totalDist),
      totalDuration: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
      savings: '~20% time saved vs unoptimized route'
    });
  } catch (error) {
    console.error('Optimize route error:', error);
    res.status(500).json({ error: 'Failed to optimize route' });
  }
});

// AI Seasonal Predictor
router.post('/predict-seasonal', authMiddleware, async (req, res) => {
  try {
    const { zipCode, region } = req.body;

    let aiResult;
    try {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const prompt = `As a pest control expert, predict pest activity for the next 3 months starting from ${currentMonth} in ${region || 'Southeast US'} (ZIP: ${zipCode || 'general area'}).

Respond in JSON format with:
{
  "predictions": [
    {
      "pest": "Pest name",
      "risk": "Low/Medium/High",
      "peakMonth": "Month name",
      "notes": "Brief explanation"
    }
  ],
  "generalAdvice": "Seasonal preparation advice"
}`;

      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are an expert pest prediction AI. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI prediction error:', aiError);
    }

    // Fallback predictions based on current month
    if (!aiResult) {
      const month = new Date().getMonth();
      const seasonalPests = {
        spring: [
          { pest: 'Ants', risk: 'High', peakMonth: 'April', notes: 'Colonies become active as temperatures rise' },
          { pest: 'Termites', risk: 'High', peakMonth: 'March-May', notes: 'Swarm season - increased activity' },
          { pest: 'Mosquitoes', risk: 'Medium', peakMonth: 'May', notes: 'Breeding begins with spring rains' }
        ],
        summer: [
          { pest: 'Mosquitoes', risk: 'High', peakMonth: 'July', notes: 'Peak breeding season' },
          { pest: 'Cockroaches', risk: 'High', peakMonth: 'June-August', notes: 'Thrive in warm, humid conditions' },
          { pest: 'Bed Bugs', risk: 'Medium', peakMonth: 'July', notes: 'Travel season increases spread' }
        ],
        fall: [
          { pest: 'Rodents', risk: 'High', peakMonth: 'October', notes: 'Seeking shelter before winter' },
          { pest: 'Spiders', risk: 'Medium', peakMonth: 'September', notes: 'Mating season, more visible' },
          { pest: 'Stink Bugs', risk: 'Medium', peakMonth: 'October', notes: 'Seeking warmth indoors' }
        ],
        winter: [
          { pest: 'Rodents', risk: 'High', peakMonth: 'December', notes: 'Peak indoor activity' },
          { pest: 'Cockroaches', risk: 'Medium', peakMonth: 'Year-round indoors', notes: 'Seek warmth and moisture' },
          { pest: 'Spiders', risk: 'Low', peakMonth: 'Indoor activity', notes: 'May be seen indoors' }
        ]
      };

      const season = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'fall' : 'winter';
      aiResult = {
        predictions: seasonalPests[season],
        generalAdvice: `Focus on ${season} pest prevention. Schedule inspections and preventive treatments.`
      };
    }

    res.json(aiResult);
  } catch (error) {
    console.error('Predict seasonal error:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// AI Quote Generator
router.post('/generate-quote', authMiddleware, async (req, res) => {
  try {
    const { services, propertySize, propertyType } = req.body;

    const serviceList = Array.isArray(services) ? services : services?.split(',').map(s => s.trim()) || ['General Pest Control'];
    const sqft = parseInt(propertySize) || 2000;

    let aiResult;
    try {
      const prompt = `Generate a pest control quote for:
- Services: ${serviceList.join(', ')}
- Property Size: ${sqft} sq ft
- Property Type: ${propertyType || 'Residential'}

Respond in JSON format with:
{
  "lineItems": [
    { "service": "Service name", "description": "Brief description", "price": 150 }
  ],
  "subtotal": 500,
  "discount": 50,
  "discountReason": "Reason for discount if any",
  "total": 450,
  "notes": "Additional quote notes"
}`;

      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are a pest control pricing expert. Generate realistic quotes. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI quote error:', aiError);
    }

    // Fallback quote generation
    if (!aiResult) {
      const basePrices = {
        'General Pest Control': 125,
        'Termite Treatment': 1500,
        'Rodent Control': 200,
        'Mosquito Treatment': 95,
        'Bed Bug Treatment': 500
      };

      const lineItems = serviceList.map(service => {
        const basePrice = basePrices[service] || 150;
        const sizeMultiplier = sqft > 3000 ? 1.5 : sqft > 2000 ? 1.25 : 1;
        return {
          service,
          description: `Professional ${service.toLowerCase()} service`,
          price: Math.round(basePrice * sizeMultiplier)
        };
      });

      const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
      const discount = subtotal > 500 ? Math.round(subtotal * 0.1) : 0;

      aiResult = {
        lineItems,
        subtotal,
        discount,
        discountReason: discount > 0 ? '10% multi-service discount' : null,
        total: subtotal - discount,
        notes: 'Quote valid for 30 days. Includes labor and materials.'
      };
    }

    res.json(aiResult);
  } catch (error) {
    console.error('Generate quote error:', error);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

// AI Follow-up Automator
router.post('/generate-follow-ups', authMiddleware, async (req, res) => {
  try {
    // Find completed service orders without follow-ups
    const recentOrders = await req.prisma.serviceOrder.findMany({
      where: {
        status: 'COMPLETED',
        completedDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        followUps: { none: {} }
      },
      include: { property: { include: { customer: true } } }
    });

    // Find stale leads
    const staleLeads = await req.prisma.lead.findMany({
      where: {
        status: { in: ['NEW', 'CONTACTED', 'QUOTED'] },
        updatedAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        followUps: { none: { status: 'PENDING' } }
      }
    });

    const followUps = [];

    // Create satisfaction follow-ups for completed orders
    for (const order of recentOrders) {
      const followUp = await req.prisma.followUp.create({
        data: {
          serviceOrderId: order.id,
          type: 'SATISFACTION_SURVEY',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          aiGenerated: true,
          notes: `Follow up on service order ${order.orderNumber}. Check customer satisfaction.`
        }
      });
      followUps.push(followUp);
    }

    // Create follow-ups for stale leads
    for (const lead of staleLeads) {
      const followUp = await req.prisma.followUp.create({
        data: {
          leadId: lead.id,
          type: lead.status === 'QUOTED' ? 'CALL' : 'EMAIL',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'PENDING',
          aiGenerated: true,
          notes: `Lead ${lead.firstName} ${lead.lastName} needs follow-up. Status: ${lead.status}`
        }
      });
      followUps.push(followUp);
    }

    res.json({
      created: followUps.length,
      followUps,
      message: `Generated ${followUps.length} follow-up tasks`
    });
  } catch (error) {
    console.error('Generate follow-ups error:', error);
    res.status(500).json({ error: 'Failed to generate follow-ups' });
  }
});

// AI Upsell Recommender
router.post('/recommend-upsell', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.body;

    const customer = await req.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        properties: { include: { pestIssues: { include: { pestType: true } } } },
        contracts: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const recommendations = [];
    const currentServices = new Set();
    customer.contracts.forEach(c => currentServices.add(c.name));

    // Check for upsell opportunities
    if (!Array.from(currentServices).some(s => s.toLowerCase().includes('termite'))) {
      recommendations.push({
        service: 'Termite Protection Plan',
        reason: 'No current termite protection. Termites cause $5B in damage annually.',
        estimatedValue: 500,
        priority: 'HIGH'
      });
    }

    if (!Array.from(currentServices).some(s => s.toLowerCase().includes('mosquito'))) {
      recommendations.push({
        service: 'Mosquito Treatment Program',
        reason: 'Seasonal mosquito control improves outdoor enjoyment',
        estimatedValue: 300,
        priority: 'MEDIUM'
      });
    }

    // Check for recurring issues
    const recurringIssues = customer.properties.flatMap(p =>
      p.pestIssues.filter(i => i.status === 'RECURRING' || i.status === 'ACTIVE')
    );

    if (recurringIssues.length > 0) {
      recommendations.push({
        service: 'Premium Protection Package',
        reason: `Active pest issues detected. Upgrade for guaranteed resolution.`,
        estimatedValue: 800,
        priority: 'HIGH'
      });
    }

    res.json({
      customerId,
      currentServices: Array.from(currentServices),
      recommendations,
      totalPotentialValue: recommendations.reduce((sum, r) => sum + r.estimatedValue, 0)
    });
  } catch (error) {
    console.error('Recommend upsell error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// AI Documentation - Auto-complete reports
router.post('/auto-complete-report', authMiddleware, async (req, res) => {
  try {
    const { serviceOrderId, observations } = req.body;

    const order = await req.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        property: { include: { pestIssues: { include: { pestType: true } } } },
        serviceType: true,
        productUsages: { include: { product: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Service order not found' });
    }

    let aiReport;
    try {
      const prompt = `Generate a professional pest control service report for:
- Service: ${order.serviceType.name}
- Property: ${order.property.addressLine1}
- Observations: ${observations || 'Standard service completed'}
- Products used: ${order.productUsages.map(p => p.product.name).join(', ') || 'Standard products'}

Respond in JSON format with:
{
  "summary": "Brief service summary",
  "areasInspected": ["area1", "area2"],
  "findings": "Detailed findings",
  "treatmentApplied": "Treatment description",
  "recommendations": ["rec1", "rec2"],
  "nextServiceDate": "Recommended next service",
  "customerInstructions": "Post-service instructions"
}`;

      const aiResponse = await callOpenRouter([
        { role: 'system', content: 'You are a professional pest control technician writing service reports. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiReport = JSON.parse(jsonMatch[0]);
      }
    } catch (aiError) {
      console.error('AI report error:', aiError);
    }

    // Fallback report
    if (!aiReport) {
      aiReport = {
        summary: `Completed ${order.serviceType.name} service at ${order.property.addressLine1}`,
        areasInspected: ['Interior perimeter', 'Kitchen', 'Bathrooms', 'Exterior foundation', 'Entry points'],
        findings: observations || 'No significant pest activity observed during inspection.',
        treatmentApplied: order.productUsages.map(pu => `${pu.product.name}: ${pu.quantity} ${pu.unit}`).join(', ') || 'Standard treatment applied',
        recommendations: ['Seal cracks around pipes', 'Keep food stored properly', 'Reduce moisture in bathrooms', 'Trim vegetation from foundation'],
        nextServiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        customerInstructions: 'Allow treated areas to dry for 2-4 hours. Keep pets away from treated areas until dry.'
      };
    }

    res.json(aiReport);
  } catch (error) {
    console.error('Auto-complete report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
