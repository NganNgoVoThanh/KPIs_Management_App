// components/approvals/ai-approval-recommendation.tsx
// AI-Powered Approval Recommendation Component
"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Brain, CheckCircle, XCircle, AlertTriangle, Clock,
  ThumbsUp, ThumbsDown, MessageSquare, Copy, Sparkles,
  Target, TrendingUp, Shield, FileText, Loader2
} from 'lucide-react';
import type { ApprovalRecommendation } from '@/lib/hooks/useAI';

interface AIApprovalRecommendationProps {
  recommendation: ApprovalRecommendation | null;
  loading: boolean;
  onApprove: (comment: string) => void;
  onRequestChanges: (comment: string) => void;
  onReject: (comment: string) => void;
}

export function AIApprovalRecommendation({
  recommendation,
  loading,
  onApprove,
  onRequestChanges,
  onReject
}: AIApprovalRecommendationProps) {
  const [selectedComment, setSelectedComment] = useState<'professional' | 'constructive' | 'developmental'>('professional');
  const [customComment, setCustomComment] = useState('');
  const [commentMode, setCommentMode] = useState<'ai' | 'custom'>('ai');

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardContent className="p-8">
          <div className="text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              AI is analyzing submission...
            </h3>
            <p className="text-sm text-blue-700">
              Evaluating KPIs, checking SMART compliance, comparing with benchmarks...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Approval Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm">
            Get AI-powered recommendations for this approval decision based on:
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>SMART criteria compliance</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Historical performance analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Peer comparison & benchmarks</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Risk assessment & recommendations</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    );
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return 'bg-green-100 text-green-700 border-green-400';
      case 'REQUEST_CHANGES': return 'bg-orange-100 text-orange-700 border-orange-400';
      case 'REJECT': return 'bg-red-100 text-red-700 border-red-400';
      default: return 'bg-gray-100 text-gray-700 border-gray-400';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return <CheckCircle className="h-6 w-6" />;
      case 'REQUEST_CHANGES': return <AlertTriangle className="h-6 w-6" />;
      case 'REJECT': return <XCircle className="h-6 w-6" />;
      default: return <Brain className="h-6 w-6" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-blue-600';
    if (confidence >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getCurrentComment = () => {
    if (commentMode === 'custom') return customComment;
    return recommendation.suggestedComments[selectedComment];
  };

  const handleAction = () => {
    const comment = getCurrentComment();
    switch (recommendation.decision) {
      case 'APPROVE':
        onApprove(comment);
        break;
      case 'REQUEST_CHANGES':
        onRequestChanges(comment);
        break;
      case 'REJECT':
        onReject(comment);
        break;
    }
  };

  return (
    <Card className={`border-2 shadow-lg ${getDecisionColor(recommendation.decision)}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            <span>AI Recommendation</span>
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={`${getDecisionColor(recommendation.decision)} border text-sm font-semibold`}>
              {recommendation.decision.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {(recommendation.confidence * 100).toFixed(0)}% Confident
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Decision Summary */}
        <div className="bg-white rounded-xl p-4 border-2 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            {getDecisionIcon(recommendation.decision)}
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">
                {recommendation.decision === 'APPROVE' && 'Recommend Approval'}
                {recommendation.decision === 'REQUEST_CHANGES' && 'Recommend Changes'}
                {recommendation.decision === 'REJECT' && 'Recommend Rejection'}
              </h4>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600">Confidence Level:</span>
                <span className={`text-2xl font-bold ${getConfidenceColor(recommendation.confidence * 100)}`}>
                  {(recommendation.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={recommendation.confidence * 100} className="h-2" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Estimated review time: {recommendation.timeEstimate} minutes</span>
          </div>
        </div>

        {/* Reasoning */}
        <div className="space-y-3">
          {/* Primary Factors */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-1">
              <Target className="h-4 w-4" />
              Primary Factors
            </h5>
            <ul className="space-y-1">
              {recommendation.reasoning.primaryFactors.map((factor, idx) => (
                <li key={idx} className="text-sm text-blue-800 flex items-start gap-1">
                  <span>•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Positive Aspects */}
          {recommendation.reasoning.positiveAspects.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                Positive Aspects
              </h5>
              <ul className="space-y-1">
                {recommendation.reasoning.positiveAspects.map((aspect, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start gap-1">
                    <span>•</span>
                    <span>{aspect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerning Aspects */}
          {recommendation.reasoning.concerningAspects.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h5 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Concerning Aspects
              </h5>
              <ul className="space-y-1">
                {recommendation.reasoning.concerningAspects.map((aspect, idx) => (
                  <li key={idx} className="text-sm text-orange-800 flex items-start gap-1">
                    <span>•</span>
                    <span>{aspect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Assessment */}
          <Alert className="bg-purple-50 border-purple-300">
            <Shield className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong className="font-semibold">Risk Assessment:</strong>
              <br />
              {recommendation.reasoning.riskAssessment}
            </AlertDescription>
          </Alert>
        </div>

        {/* Specific Feedback per KPI */}
        {recommendation.specificFeedback && recommendation.specificFeedback.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              KPI-Specific Feedback
            </h4>
            {recommendation.specificFeedback.map((feedback, idx) => (
              <Card key={idx} className="bg-white border shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h5 className="font-semibold text-sm">{feedback.kpiTitle}</h5>
                    <Badge className={
                      feedback.severity === 'high' ? 'bg-red-100 text-red-700' :
                      feedback.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {feedback.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Issue:</strong> {feedback.issue}
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Suggestion:</strong> {feedback.suggestion}
                  </p>
                  {feedback.requiredAction && (
                    <Alert className="bg-yellow-50 border-yellow-300 mt-2">
                      <AlertDescription className="text-sm text-yellow-800">
                        <strong>Action Required:</strong> {feedback.requiredAction}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Suggested Comments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Suggested Comment
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommentMode('ai')}
                className={commentMode === 'ai' ? 'bg-purple-50 border-purple-500' : ''}
              >
                AI Generated
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommentMode('custom')}
                className={commentMode === 'custom' ? 'bg-purple-50 border-purple-500' : ''}
              >
                Custom
              </Button>
            </div>
          </div>

          {commentMode === 'ai' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {(['professional', 'constructive', 'developmental'] as const).map((style) => (
                  <Button
                    key={style}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedComment(style)}
                    className={selectedComment === style ? 'bg-blue-50 border-blue-500' : ''}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="bg-white border-2 rounded-lg p-4 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(recommendation.suggestedComments[selectedComment])}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <p className="text-sm text-gray-700 pr-10 whitespace-pre-wrap">
                  {recommendation.suggestedComments[selectedComment]}
                </p>
              </div>
            </div>
          )}

          {commentMode === 'custom' && (
            <Textarea
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder="Write your custom comment..."
              rows={6}
              className="text-sm"
            />
          )}
        </div>

        {/* Next Steps */}
        {recommendation.nextSteps && recommendation.nextSteps.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <h5 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Next Steps
            </h5>
            <ul className="space-y-1">
              {recommendation.nextSteps.map((step, idx) => (
                <li key={idx} className="text-sm text-indigo-800 flex items-start gap-1">
                  <span>{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {recommendation.decision === 'APPROVE' && (
            <>
              <Button
                onClick={handleAction}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Approve with AI Comment
              </Button>
              <Button
                onClick={() => onRequestChanges(getCurrentComment())}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <AlertTriangle className="mr-2 h-5 w-5" />
                Request Changes Instead
              </Button>
            </>
          )}

          {recommendation.decision === 'REQUEST_CHANGES' && (
            <>
              <Button
                onClick={handleAction}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                <AlertTriangle className="mr-2 h-5 w-5" />
                Request Changes with AI Comment
              </Button>
              <Button
                onClick={() => onApprove(getCurrentComment())}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Approve Anyway
              </Button>
            </>
          )}

          {recommendation.decision === 'REJECT' && (
            <>
              <Button
                onClick={handleAction}
                className="flex-1 bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <XCircle className="mr-2 h-5 w-5" />
                Reject with AI Comment
              </Button>
              <Button
                onClick={() => onRequestChanges(getCurrentComment())}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <AlertTriangle className="mr-2 h-5 w-5" />
                Request Changes Instead
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
