from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Issue
from .permissions import require_workspace_access
from .serializers import IssueCreateSerializer, IssueSerializer, IssueUpdateSerializer
from .services import create_issue, update_issue

class Health(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({"status": "ok"})

class IssueListCreate(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, workspace_id):
        require_workspace_access(request, workspace_id)
        issues = Issue.objects.filter(workspace_id=workspace_id)
        project_id = request.query_params.get("project_id")
        if project_id:
            issues = issues.filter(project_id=project_id)
        return Response(IssueSerializer(issues, many=True).data)
    def post(self, request, workspace_id):
        require_workspace_access(request, workspace_id)
        serializer = IssueCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue = create_issue(workspace_id, request.user.id, serializer.validated_data)
        return Response(IssueSerializer(issue).data, status=status.HTTP_201_CREATED)

class IssueDetail(APIView):
    permission_classes = [IsAuthenticated]
    def get_object(self, workspace_id, issue_id):
        return get_object_or_404(Issue, id=issue_id, workspace_id=workspace_id)
    def get(self, request, workspace_id, issue_id):
        require_workspace_access(request, workspace_id)
        return Response(IssueSerializer(self.get_object(workspace_id, issue_id)).data)
    def patch(self, request, workspace_id, issue_id):
        require_workspace_access(request, workspace_id)
        issue = self.get_object(workspace_id, issue_id)
        serializer = IssueUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(IssueSerializer(update_issue(issue, serializer.validated_data)).data)
