const express = require('express');
const pool = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { validateInput } = require('../middleware/validator');

const router = express.Router();

// AI Symptom Checker endpoint (basic implementation)
router.post('/check',
  authenticate,
  authorize('patient'),
  validateInput({
    symptoms: { required: true, minLength: 10 }
  }),
  async (req, res) => {
    const patientId = req.user.id;
    const { symptoms } = req.body;

    try {
      // This is a placeholder for actual AI/RAG implementation
      // In production, this would:
      // 1. Query vector database for similar symptoms
      // 2. Use LLM to generate response based on retrieved medical knowledge
      // 3. Return suggestions with confidence scores and disclaimers

      const aiResponse = generatePlaceholderResponse(symptoms);

      // Log the symptom check for audit
      await pool.query(
        `INSERT INTO symptom_checks (patient_id, symptoms, ai_response, confidence_score) 
         VALUES ($1, $2, $3, $4)`,
        [patientId, symptoms, JSON.stringify(aiResponse), aiResponse.confidence]
      );

      res.json({
        disclaimer: '⚠️ IMPORTANT: This is NOT a medical diagnosis. Please consult with a qualified healthcare professional for proper diagnosis and treatment.',
        response: aiResponse,
        recommendation: 'We strongly recommend scheduling a consultation with one of our doctors for a proper evaluation.'
      });
    } catch (error) {
      console.error('Error in symptom checker:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get patient's symptom check history
router.get('/history',
  authenticate,
  authorize('patient'),
  async (req, res) => {
    const patientId = req.user.id;

    try {
      const result = await pool.query(
        `SELECT id, symptoms, ai_response, confidence_score, created_at 
         FROM symptom_checks 
         WHERE patient_id = $1 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [patientId]
      );

      res.json({
        history: result.rows
      });
    } catch (error) {
      console.error('Error fetching symptom check history:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Placeholder function for AI response generation
// In production, this would be replaced with actual RAG + LLM implementation
function generatePlaceholderResponse(symptoms) {
  const lowerSymptoms = symptoms.toLowerCase();

  // Simple keyword-based placeholder logic
  const responses = {
    fever_cough: {
      conditions: ['Common Cold', 'Influenza', 'COVID-19', 'Upper Respiratory Infection'],
      suggestions: [
        'Rest and stay hydrated',
        'Monitor your temperature',
        'Consider over-the-counter fever reducers',
        'Isolate yourself to prevent spread'
      ],
      redFlags: [
        'Difficulty breathing',
        'Persistent high fever (>39°C for >3 days)',
        'Severe chest pain'
      ],
      confidence: 0.65
    },
    headache: {
      conditions: ['Tension Headache', 'Migraine', 'Dehydration', 'Stress'],
      suggestions: [
        'Rest in a quiet, dark room',
        'Stay hydrated',
        'Apply cold or warm compress',
        'Consider pain relievers if needed'
      ],
      redFlags: [
        'Sudden, severe headache ("thunderclap")',
        'Headache with vision changes',
        'Stiff neck with fever'
      ],
      confidence: 0.60
    },
    stomach: {
      conditions: ['Gastritis', 'Food Poisoning', 'Indigestion', 'Gastroenteritis'],
      suggestions: [
        'Stay hydrated with water and electrolyte solutions',
        'Eat bland foods (BRAT diet: bananas, rice, applesauce, toast)',
        'Avoid dairy, fatty, or spicy foods',
        'Rest'
      ],
      redFlags: [
        'Severe abdominal pain',
        'Blood in vomit or stool',
        'Signs of dehydration',
        'High fever'
      ],
      confidence: 0.55
    },
    default: {
      conditions: ['Multiple possible conditions - requires professional evaluation'],
      suggestions: [
        'Monitor your symptoms',
        'Keep a symptom diary',
        'Stay hydrated and rest',
        'Seek medical attention if symptoms worsen'
      ],
      redFlags: [
        'Severe or worsening symptoms',
        'Symptoms lasting more than a few days',
        'Any concerning or unusual symptoms'
      ],
      confidence: 0.40
    }
  };

  // Simple keyword matching (to be replaced with actual AI/ML)
  let selectedResponse = responses.default;

  if ((lowerSymptoms.includes('fever') || lowerSymptoms.includes('cough')) &&
      (lowerSymptoms.includes('fever') && lowerSymptoms.includes('cough'))) {
    selectedResponse = responses.fever_cough;
  } else if (lowerSymptoms.includes('headache') || lowerSymptoms.includes('head pain')) {
    selectedResponse = responses.headache;
  } else if (lowerSymptoms.includes('stomach') || lowerSymptoms.includes('nausea') ||
             lowerSymptoms.includes('vomit') || lowerSymptoms.includes('diarrhea')) {
    selectedResponse = responses.stomach;
  }

  return {
    possible_conditions: selectedResponse.conditions,
    self_care_suggestions: selectedResponse.suggestions,
    red_flags: selectedResponse.redFlags,
    confidence: selectedResponse.confidence,
    note: 'This is a preliminary assessment based on limited information. Individual cases vary significantly.'
  };
}

module.exports = router;
