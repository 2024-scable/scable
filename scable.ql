/**
 * @kind path-problem
 * @id python/tain-tracking
 */

 import python
 import semmle.python.dataflow.new.DataFlow
 import semmle.python.dataflow.new.TaintTracking
 import semmle.python.dataflow.new.RemoteFlowSources
 import DataFlow::PathGraph

  class Config extends TaintTracking::Configuration {
    Config() { this = "config" }

    override predicate isSource(DataFlow::Node source) {
     source instanceof RemoteFlowSource
    }

    override predicate isSink(DataFlow::Node sink) {
      any()
    }
  }

  from Config conf, DataFlow::PathNode source, DataFlow::PathNode sink

  where conf.hasFlowPath(source, sink)

  select sink.getNode(), source, sink,
  sink.getNode().asExpr().getScope().(Function).getName()
  + ", " + sink.getNode().asExpr().(Call).toString()
  + ", " + sink.getNode().asExpr().(Call).getAChildNode().toString()
  + ", " + sink.getNode().asExpr().(Call).getAChildNode().getAChildNode().toString()
  + ", " + sink.getNode().asExpr().(Call).getAChildNode().(Attribute).getName()
