import Joi from 'joi';
import { Rating } from '../models/Rating.js';

const createRatingSchema = Joi.object({
  movieCode: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  note: Joi.string().optional(),
  ratedBy: Joi.string().hex().length(24).optional(),
});

// GET /api/ratings
export async function getAllRatings(req, res, next) {
  try {
    const ratings = await Rating.find().lean();
    res.json({ ratings });
  } catch (err) {
    next(err);
  }
}

// GET /api/ratings/:id
export async function getRating(req, res, next) {
  try {
    const rating = await Rating.findById(req.params.id).lean();
    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    res.json({ rating });
  } catch (err) {
    next(err);
  }
}

// POST /api/ratings
export async function createRating(req, res, next) {
  try {
    const { value, error } = createRatingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const rating = await Rating.create(value);
    res.status(201).json({ rating });
  } catch (err) {
    // Handle MongoDB duplicate key error for compound index
    if (err.code === 11000) {
      return res.status(409).json({ message: 'User has already rated this movie' });
    }
    next(err);
  }
}

// GET /api/ratings/summary?movieCode=...
export async function getRatingSummary(req, res, next) {
  try {
    const { movieCode } = req.query;
    if (!movieCode) {
      return res.status(400).json({ message: 'movieCode is required' });
    }

    const results = await Rating.aggregate([
      { $match: { movieCode: movieCode } },
      {
        $group: {
          _id: '$movieCode',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    if (results.length === 0) {
      return res.json({
        movieCode: movieCode,
        averageRating: 0,
        ratingCount: 0,
      });
    }

    const { _id, averageRating, ratingCount } = results[0];
    res.json({
      movieCode: _id,
      averageRating,
      ratingCount,
    });
  } catch (err) {
    next(err);
  }
}
